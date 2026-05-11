# 🎬 Médiathèque — Bibliothèque locale de films, séries et animés

Application **Node.js complète** qui tourne en local sur ton PC. Données sauvegardées en JSON sur le disque, images de couverture stockées localement.

---

## 🚀 Installation en 3 étapes

### 1. Installe Node.js
→ https://nodejs.org (version LTS recommandée)

### 2. Lance l'installation des dépendances
```bash
cd mediatheque
npm install
```

### 3. Démarre le serveur
```bash
npm start
```

Puis ouvre ton navigateur sur → **http://localhost:3000**

---

## 📦 Structure des fichiers

```
mediatheque/
├── server.js          ← Serveur Express (API REST)
├── package.json       ← Dépendances Node.js
├── data/
│   └── library.json   ← Ta bibliothèque (créé automatiquement)
└── public/
    ├── index.html     ← Interface web
    └── covers/        ← Images de couverture (créé automatiquement)
```

---

## ✨ Fonctionnalités

### Bibliothèque
- ✅ Ajout de **séries**, **films** et **animés**
- ✅ Statuts : À voir / En cours / Terminé / Abandonné
- ✅ Suivi des épisodes avec boutons +1 / −1 rapides
- ✅ Note de 1 à 10 avec étoiles
- ✅ Genre, année, studio/réalisateur
- ✅ Synopsis et notes personnelles
- ✅ Tags personnalisés

### Couvertures
- ✅ Upload d'image depuis ton PC
- ✅ URL d'image distante
- ✅ Glisser-déposer une image
- ✅ Images stockées dans `public/covers/`

### Recherche & Filtres
- ✅ Recherche par titre ou genre
- ✅ Filtre par type (série/film/animé)
- ✅ Filtre par statut
- ✅ Tri : récent, alphabétique, note, progression
- ✅ Vue grille ou liste

### Scanner de dossier
- ✅ Scanne un dossier local pour trouver tes fichiers vidéo
- ✅ Formats : mkv, mp4, avi, mov, wmv, m4v, ts, webm, flv
- ✅ Import rapide vers la bibliothèque

### Statistiques
- ✅ Nombre total par type et statut
- ✅ Total d'épisodes vus
- ✅ Note moyenne
- ✅ Top 5 des mieux notés
- ✅ Répartition par genre
- ✅ Ajouts récents

### Export
- ✅ Export JSON complet → GET http://localhost:3000/api/export

---

## 🛠 API REST disponible

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/media | Liste (filtres: type, status, search, sort) |
| GET | /api/media/:id | Détail d'un média |
| POST | /api/media | Ajouter (multipart/form-data) |
| PUT | /api/media/:id | Modifier |
| DELETE | /api/media/:id | Supprimer |
| PATCH | /api/media/:id/progress | Mettre à jour les épisodes |
| GET | /api/stats | Statistiques globales |
| POST | /api/scan | Scanner un dossier |
| GET | /api/export | Export JSON complet |

---

## 🔧 Développement (rechargement auto)

```bash
npm run dev
```
(nécessite nodemon, inclus dans les devDependencies)

---

## 💾 Sauvegarde des données

Toutes tes données sont dans `data/library.json`. Pour sauvegarder :
```bash
cp data/library.json data/library.backup.json
```

---

## 🌐 Accès depuis d'autres appareils du réseau

Change la ligne dans `server.js` :
```js
app.listen(PORT, () => { ... });
// → 
app.listen(PORT, '0.0.0.0', () => { ... });
```
Puis accède avec l'IP locale de ton PC : `http://192.168.x.x:3000`
