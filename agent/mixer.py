import numpy as np


def mix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Additively mix two int16 PCM arrays. Normalizes if peak exceeds int16 range."""
    mixed = a.astype(np.float32) + b.astype(np.float32)
    peak = np.abs(mixed).max()
    if peak > 32767:
        mixed = mixed * (32767.0 / peak)
    return mixed.astype(np.int16)
