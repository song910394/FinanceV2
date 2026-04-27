# H&S 記帳 V2 (FinanceV2)

[原版 Finance](https://github.com/song910394/Finance) 的重新設計版。**完全相容原版資料**，可與原版共用同一份 Google Sheet。

## ✨ V2 重點

- 🎨 **6 套主題切換**：暖米色 / 馬卡龍 / 夜幕 / 薄荷 / 夕陽 / 極簡
- 📱 **PWA 離線優先**：可加到主畫面，無網路時也能記帳，連網後同步
- 🔒 **預設不自動同步**：第一次開 APP 不連網路；要進「設定」貼上 Apps Script URL 才同步
- 🔄 **與原版資料完全相容**：`BackupData` 格式 100% 相同，可雙向同步
- 🌃 **iOS 安全區域**：瀏海/底部 home bar 不擋畫面

## 🚀 部署

push 到 `main` 即自動部署到 GitHub Pages：
**https://song910394.github.io/FinanceV2/**

## 📲 安裝到手機（PWA）

**iOS Safari**：開上面的 URL → 分享 → 加到主畫面
**Android Chrome**：開 URL → 選單 → 安裝應用程式

## 🔄 從原版 Finance 遷移資料

1. 開 V2 → 設定 → 「Google 試算表同步」
2. 把原版 Finance 用的 Apps Script URL 貼進來
3. 點「從雲端載入」 → 全部資料（交易、信用卡設定、薪資、預算）會載入
4. 之後 V2 編輯也會同步寫回同一份試算表，與原版互通

## 🛠 本機開發

```bash
npm install --legacy-peer-deps
npm run dev    # http://localhost:5050
npm run build  # 產出 ./dist
```

## 📐 技術棧

Vite 6 · React 19 · TypeScript · Tailwind · Recharts · Lucide · PWA (Service Worker)

## 📄 授權

私人專案，僅供個人使用。
