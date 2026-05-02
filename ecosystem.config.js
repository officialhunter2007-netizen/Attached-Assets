module.exports = {
  apps: [{
    name: "api-server",
    script: "./artifacts/api-server/dist/index.mjs",
    cwd: "/root/nukhba/Attached-Assets",
    interpreter: "node",
    interpreter_args: "--enable-source-maps",
    env: {
      NODE_ENV: "production",
      PORT: "8080",
      OPENROUTER_API_KEY: "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"
    }
  }]
}
