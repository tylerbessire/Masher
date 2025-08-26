import numpy as np
import soundfile as sf
import librosa
import io
import pyrubberband as rb

def load_wav(path_or_bytes, sr=44100):
    """Loads a WAV file from a path or bytes buffer."""
    if isinstance(path_or_bytes, str):
        y, sr = librosa.load(path_or_bytes, sr=sr, mono=False)
    else:
        y, sr = librosa.load(io.BytesIO(path_or_bytes), sr=sr, mono=False)

    # Ensure stereo
    if y.ndim == 1:
        y = np.stack([y, y])
    return y, sr

def save_wav(path, y, sr):
    """Saves a NumPy array as a WAV file."""
    sf.write(path, y.T, sr)

def pitch_shift_semitones(y, sr, semitones, preserve_formants=True):
    """High-quality pitch shifting using pyrubberband."""
    # Rubberband's formant preservation is generally good for vocals
    return rb.pitch_shift(y, sr, semitones)

def stretch_to_grid_piecewise(y, sr, beats, target_beats):
    """High-quality time stretching to align two beat grids."""
    # This is a complex operation. A simplified version:
    original_duration = librosa.frames_to_time(len(y), sr=sr)
    target_duration = target_beats[-1]
    rate = original_duration / target_duration
    return rb.time_stretch(y, sr, rate)

def apply_gain_db(y, gain_db):
    """Applies gain to audio data in dB."""
    return y * (10 ** (gain_db / 20.0))

def apply_replay_gain(y, sr):
    """Applies ReplayGain-style loudness normalization."""
    # This is a simplified version. A real implementation would use a proper
    # EBU R128 loudness measurement.
    target_lufs = -14.0

    # Use librosa's RMS as a proxy for loudness
    rms = librosa.feature.rms(y=y)
    avg_rms = np.mean(rms)
    if avg_rms == 0: return y

    # Convert RMS to dB
    avg_db = 20 * np.log10(avg_rms)

    # Calculate gain needed to reach target LUFS (approximated)
    gain_db = target_lufs - avg_db

    return apply_gain_db(y, gain_db)
