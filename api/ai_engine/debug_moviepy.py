import moviepy.video.fx as vfx
try:
    import moviepy.video.fx.all as vfx_all
    print("Available in vfx.all:", dir(vfx_all))
except ImportError:
    print("Could not import moviepy.video.fx.all")

print("Available in vfx:", dir(vfx))
