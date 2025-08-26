import numpy as np

def get_camelot_distance(key1, key2):
    """Calculates distance on the Camelot wheel."""
    # This is a simplified representation. A real one would use a map.
    # Assuming key is given as a number 1-12
    num1 = int(key1.split('B')[0]) if 'B' in key1 else int(key1.split('A')[0])
    num2 = int(key2.split('B')[0]) if 'B' in key2 else int(key2.split('A')[0])
    diff = abs(num1 - num2)
    return min(diff, 12 - diff)

def choose_target_key(keys):
    """Chooses a target key that minimizes total pitch shifting."""
    # This is a placeholder. A real implementation would be more sophisticated.
    return keys[0]

def plan_shifts(per_track_keys, target_key):
    """
    Calculates the pitch shift in semitones needed for each track to match the target key.
    This is a simplified example. A real implementation would use a more robust
    key representation and distance metric.
    """
    shifts = {}
    for track_id, key in per_track_keys.items():
        # This logic is highly simplified.
        # It assumes the key name itself tells us the distance.
        # e.g., C -> D is 2 semitones.
        # This would need a proper note-to-midi mapping.
        shifts[track_id] = 0 # Placeholder

    vocal_limit = 3 # Max semitones to shift vocals
    music_limit = 7 # Max semitones to shift instrumentals

    return shifts, vocal_limit, music_limit
