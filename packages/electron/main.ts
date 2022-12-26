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
    path.join(__dirname, "../../core/dev-tool/front_end/devtools_app.html"),
    {
      query: {
        ws: "localhost:9222/devtools/page/124655E7CF111310BAA700479191BCBC",
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
