import { app, BrowserWindow } from "electron";

import path from "path";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    //titleBarStyle: "hidden",
    //frame: false
    //webPreferences: {
    //  preload: path.join(__dirname, './preload.js'),
    //},
  });

  //if (process.env.VITE_DEV_SERVER_URL) {
  //  win.loadURL(process.env.VITE_DEV_SERVER_URL);
  //} else {
  //  win.loadFile(path.join(__dirname, "../../core/dist/index.html"));
  //}
  win.loadFile(
    path.join(__dirname, "../../core/dev-tool/devtools_app.html"),
    {
      query: {
        ws: "localhost:9222/devtools/page/B49C1D081F81977D13891661ED4284D9",
      },
    }
  );
  //win.webContents.openDevTools({ mode: "right" });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
