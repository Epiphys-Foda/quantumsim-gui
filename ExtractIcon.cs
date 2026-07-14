using System;
using System.Drawing;
using System.Runtime.InteropServices;

class ExtractIcon {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int PrivateExtractIcons(string file, int index, int cx, int cy, IntPtr[] phicon, int[] piconid, int n, int flags);

    [DllImport("user32.dll")]
    static extern bool DestroyIcon(IntPtr hIcon);

    static void Main() {
        string exe = @"C:\FodaOS\cauchy-gui\src-tauri\target\release\quantumsim-gui.exe";
        int[] sizes = { 16, 32, 48, 256 };
        foreach (int size in sizes) {
            var phicon = new IntPtr[1];
            var piconid = new int[1];
            int result = PrivateExtractIcons(exe, 0, size, size, phicon, piconid, 1, 0x80);
            if (result > 0 && phicon[0] != IntPtr.Zero) {
                var ico = Icon.FromHandle(phicon[0]);
                var bmp = ico.ToBitmap();
                int white = 0, total = 0;
                for (int y = 0; y < bmp.Height; y++) {
                    for (int x = 0; x < bmp.Width; x++) {
                        var p = bmp.GetPixel(x, y);
                        if (p.A < 50) continue;
                        total++;
                        if (p.R > 200 && p.G > 200 && p.B > 200) white++;
                    }
                }
                double pct = total > 0 ? 100.0 * white / total : 0;
                Console.WriteLine(string.Format("Size {0}: {1}x{2}, opaque={3}, white={4} ({5:F1}%)", size, bmp.Width, bmp.Height, total, white, pct));
                if (size == 32) {
                    bmp.Save(@"C:\FodaOS\cauchy-gui\final_exe_icon_32.png", System.Drawing.Imaging.ImageFormat.Png);
                }
                ico.Dispose();
                bmp.Dispose();
                DestroyIcon(phicon[0]);
            } else {
                Console.WriteLine(string.Format("Size {0}: extraction failed (result={1})", size, result));
            }
        }
    }
}
