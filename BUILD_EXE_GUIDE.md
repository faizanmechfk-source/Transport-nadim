# Transport Entry - GitHub Auto-Build & Windows .EXE Guide

Ye project GitHub Actions CI/CD ke saath fully configured hai. Jab bhi aap GitHub par code upload (push) karenge, GitHub automatically Windows `.exe` build ready kar dega.

---

## 🚀 1. GitHub Par Upload Kaise Karein (Push Instructions)

Agar aap pehli baar GitHub par upload kar rahe hain:

```bash
# 1. Git repository initialize karein (agar nahi hai)
git init

# 2. Saari files add karein
git add .

# 3. Commit karein
git commit -m "feat: complete transport entry app with windows .exe build support"

# 4. GitHub repo link karein (Apna repo URL yahan daalein)
git remote add origin https://github.com/AAPKA_USERNAME/AAPKA_REPO_NAME.git

# 5. Main branch par push karein
git branch -M main
git push -u origin main
```

---

## 📦 2. GitHub Se `.exe` File Kaise Download Karein

Push karte hi GitHub Actions automatically run hoga aur `.exe` create karega:

1. Apne GitHub repository me jayein.
2. Upar **"Actions"** tab par click karein.
3. Wahan **"Build Windows .EXE Desktop App"** workflow run hota hua dikhega (green check hone tak 2-3 minute wait karein).
4. Run par click karein.
5. Niche **"Artifacts"** section me aapko **`Transport-Entry-Windows-EXE`** dikhega.
6. Us par click karte hi Windows `.exe` download ho jayega!
   - Isme **NSIS Setup Installer** (`Transport Entry Setup 1.0.0.exe`) aur **Portable .exe** (`Transport Entry 1.0.0.exe`) dono shamil hain.

---

## 🏷️ 3. Automatic Public Release (.exe Direct 1-Click Link)

Agar aap chahte hain ki GitHub Releases me direct download link bane:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions automatically **v1.0.0 Release** create karega aur `.exe` file release me attach kar dega jahan se koi bhi 1-click me direct download kar sakta hai.

---

## 💻 4. Apne Computer Par Locally `.exe` Banana (Optional)

Agar aap apne PC me bina GitHub ke `.exe` banana chahte hain:

```bash
# Web application build karein
npm run build

# Desktop directory me dependencies install karein
cd desktop
npm install

# Windows .exe create karein
npm run dist
```

Build complete hone par `desktop/release/` folder me `.exe` files mil jayengi.
