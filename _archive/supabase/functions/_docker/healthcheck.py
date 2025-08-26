import sys
try:
    import torch, librosa  # noqa
    from demucs.apply import apply_model  # noqa
except Exception as e:
    print("healthcheck import error:", e, file=sys.stderr)
    sys.exit(1)
print("ok")
