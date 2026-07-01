const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const PORT = 3500;
let mainWindow = null;
let serverProcess = null;

function startNextServer() {
    return new Promise((resolve) => {
        // standalone 输出在 .next/standalone/ 下
        const serverDir = path.join(
            __dirname, "..", ".next", "standalone"
        );
        const env = {
            ...process.env,
            NODE_ENV: "production",
            PORT: String(PORT),
        };

        serverProcess = spawn(
            "node",
            [path.join(serverDir, "server.js")],
            {
                cwd: serverDir,
                env,
                stdio: ["ignore", "pipe", "pipe"],
            }
        );

        serverProcess.stderr.on("data", (d) => {
            process.stderr.write(d);
        });

        const check = () => {
            http.get(`http://127.0.0.1:${PORT}`, () => resolve())
                .on("error", () => setTimeout(check, 300));
        };
        check();
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: "奶牛行为智能检测系统 V1.1",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    await startNextServer();
    createWindow();
});

app.on("window-all-closed", () => {
    if (serverProcess) serverProcess.kill();
    app.quit();
});

app.on("before-quit", () => {
    if (serverProcess) serverProcess.kill();
});
