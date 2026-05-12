// Captures macOS system audio via CoreAudio process tap and writes raw PCM to stdout.
// Format: 16-bit signed little-endian, mono, 16 kHz.
// Requires macOS 14.2+. No Screen Recording permission needed.
//
// Usage: ./capture_system   (stdout = PCM, stderr = log messages)

import AudioToolbox
import CoreAudio
import Foundation

private let kTargetRate: Double = 16_000
private var gDeviceSampleRate: Double = 48_000

// MARK: - IOProc (top-level C-compatible function)

private func captureIOProc(
    _ inDevice: AudioObjectID,
    _ inNow: UnsafePointer<AudioTimeStamp>,
    _ inInputData: UnsafePointer<AudioBufferList>,
    _ inInputTime: UnsafePointer<AudioTimeStamp>,
    _ outOutputData: UnsafeMutablePointer<AudioBufferList>,
    _ inOutputTime: UnsafePointer<AudioTimeStamp>,
    _ inClientData: UnsafeMutableRawPointer?
) -> OSStatus {
    let bufferList = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: inInputData))
    let totalBuffers = bufferList.count
    guard totalBuffers >= 1 else { return noErr }

    // Tap stream is always last in the aggregate device buffer list.
    let tapBuf = bufferList[totalBuffers - 1]
    guard let tapRaw = tapBuf.mData, tapBuf.mDataByteSize > 0 else { return noErr }
    let frameCount = Int(tapBuf.mDataByteSize) / MemoryLayout<Float32>.size
    let tapFloats = tapRaw.assumingMemoryBound(to: Float32.self)

    // Mic is buffer[0] — the real input device added to the aggregate for clock + capture.
    // mNumberChannels tells us stride (1 = mono/non-interleaved, 2 = stereo interleaved).
    var micFloats: UnsafeMutablePointer<Float32>? = nil
    var micStride = 1
    var micFrameCount = 0
    if totalBuffers >= 2 {
        let micBuf = bufferList[0]
        if let micRaw = micBuf.mData, micBuf.mDataByteSize > 0 {
            micStride = max(1, Int(micBuf.mNumberChannels))
            micFrameCount = Int(micBuf.mDataByteSize) / (MemoryLayout<Float32>.size * micStride)
            micFloats = micRaw.assumingMemoryBound(to: Float32.self)
        }
    }

    let srcRate = gDeviceSampleRate
    let outCount = Int(Double(frameCount) * kTargetRate / srcRate)
    guard outCount > 0 else { return noErr }

    var out = Data(count: outCount * 2)
    out.withUnsafeMutableBytes { ptr in
        let s = ptr.bindMemory(to: Int16.self)
        for i in 0..<outCount {
            let si = Double(i) * srcRate / kTargetRate
            let lo = Int(si)
            let hi = min(lo + 1, frameCount - 1)
            let frac = Float(si - Double(lo))

            let tapV = tapFloats[lo] * (1 - frac) + tapFloats[hi] * frac

            var micV: Float = 0
            if let mic = micFloats, lo < micFrameCount {
                let mhi = min(hi, micFrameCount - 1)
                micV = mic[lo * micStride] * (1 - frac) + mic[mhi * micStride] * frac
            }

            s[i] = Int16(max(-1.0, min(1.0, tapV + micV)) * 32_767)
        }
    }
    FileHandle.standardOutput.write(out)
    return noErr
}

// MARK: - Helpers

private func defaultInputDeviceUID() -> String? {
    var deviceID: AudioDeviceID = kAudioObjectUnknown
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    guard AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &deviceID
    ) == noErr, deviceID != kAudioObjectUnknown else { return nil }

    var uidAddr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceUID,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var uid: Unmanaged<CFString>? = nil
    var uidSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(deviceID, &uidAddr, 0, nil, &uidSize, &uid) == noErr else { return nil }
    return uid?.takeRetainedValue() as String?
}

private func deviceSampleRate(_ deviceID: AudioObjectID) -> Double {
    var rate: Float64 = 48_000
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyNominalSampleRate,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var size = UInt32(MemoryLayout<Float64>.size)
    AudioObjectGetPropertyData(deviceID, &addr, 0, nil, &size, &rate)
    return Double(rate)
}

// MARK: - Capture

enum CaptureError: Error {
    case tapFailed(OSStatus)
    case aggFailed(OSStatus)
    case ioProcFailed(OSStatus)
    case startFailed(OSStatus)
}

private var gTapID: AudioObjectID = kAudioObjectUnknown
private var gAggID: AudioObjectID = kAudioObjectUnknown
private var gProcID: AudioDeviceIOProcID? = nil

func startCapture() throws {
    // 1. Global mono tap — capture all processes
    let desc = CATapDescription()
    desc.name = "TranscriberAudioTap"
    desc.isMono = true
    desc.isExclusive = true  // tap all EXCEPT listed (empty = all)
    desc.isMixdown = true
    desc.isPrivate = true
    desc.muteBehavior = .unmuted

    var tID: AudioObjectID = kAudioObjectUnknown
    var err = AudioHardwareCreateProcessTap(desc, &tID)
    guard err == noErr else {
        fputs("[capture_system] AudioHardwareCreateProcessTap failed: \(err)\n", stderr)
        throw CaptureError.tapFailed(err)
    }
    gTapID = tID
    fputs("[capture_system] tap id=\(tID) uid=\(desc.uuid.uuidString)\n", stderr)

    // 2. Aggregate device: tap + real input device (for clock)
    let tapUID = desc.uuid.uuidString
    let aggUID = "com.transcriber.\(UUID().uuidString)"
    var aggSpec: [String: Any] = [
        kAudioAggregateDeviceNameKey: "TranscriberCapture",
        kAudioAggregateDeviceUIDKey: aggUID,
        kAudioAggregateDeviceTapListKey: [[kAudioSubTapUIDKey: tapUID]],
        kAudioAggregateDeviceIsPrivateKey: true,
        kAudioAggregateDeviceTapAutoStartKey: false,
    ]
    if let inputUID = defaultInputDeviceUID() {
        aggSpec[kAudioAggregateDeviceSubDeviceListKey] = [[kAudioSubDeviceUIDKey: inputUID]]
        aggSpec[kAudioAggregateDeviceMainSubDeviceKey] = inputUID
        fputs("[capture_system] clock source: \(inputUID)\n", stderr)
    }

    var aID: AudioObjectID = kAudioObjectUnknown
    err = AudioHardwareCreateAggregateDevice(aggSpec as CFDictionary, &aID)
    guard err == noErr else {
        fputs("[capture_system] AudioHardwareCreateAggregateDevice failed: \(err)\n", stderr)
        throw CaptureError.aggFailed(err)
    }
    gAggID = aID
    gDeviceSampleRate = deviceSampleRate(aID)
    fputs("[capture_system] aggregate id=\(aID) rate=\(gDeviceSampleRate) Hz\n", stderr)

    // 3. Register IOProc on the aggregate device
    var procID: AudioDeviceIOProcID? = nil
    err = AudioDeviceCreateIOProcID(aID, captureIOProc, nil, &procID)
    guard err == noErr else {
        fputs("[capture_system] AudioDeviceCreateIOProcID failed: \(err)\n", stderr)
        throw CaptureError.ioProcFailed(err)
    }
    gProcID = procID

    // 4. Start capturing
    err = AudioDeviceStart(aID, procID)
    guard err == noErr else {
        fputs("[capture_system] AudioDeviceStart failed: \(err)\n", stderr)
        throw CaptureError.startFailed(err)
    }
    let micStatus = defaultInputDeviceUID() != nil ? "mic+system" : "system-only"
    fputs("[capture_system] started (\(micStatus) audio, rate=\(Int(gDeviceSampleRate)) Hz)\n", stderr)
}

func stopCapture() {
    if let procID = gProcID {
        AudioDeviceStop(gAggID, procID)
        AudioDeviceDestroyIOProcID(gAggID, procID)
        gProcID = nil
    }
    if gAggID != kAudioObjectUnknown {
        AudioHardwareDestroyAggregateDevice(gAggID)
        gAggID = kAudioObjectUnknown
    }
    if gTapID != kAudioObjectUnknown {
        AudioHardwareDestroyProcessTap(gTapID)
        gTapID = kAudioObjectUnknown
    }
}

// MARK: - Entry point

do {
    try startCapture()
} catch {
    fputs("[capture_system] failed: \(error)\n", stderr)
    exit(1)
}

signal(SIGTERM) { _ in stopCapture(); exit(0) }
signal(SIGINT)  { _ in stopCapture(); exit(0) }

RunLoop.main.run()
