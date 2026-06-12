# Noest Agent

Agent de monitoring en lecture seule pour le dashboard vendeur Noest Express.

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
npm install
npx playwright install chromium
```

## Configuration

Copier le fichier `.env.example` vers `.env` et remplir les variables :

```bash
cp .env.example .env
```

Variables requises :

| Variable              | Description                 |
| --------------------- | --------------------------- |
| `NOEST_EMAIL`         | Email du compte vendeur     |
| `NOEST_PASSWORD`      | Mot de passe du compte      |
| `TELEGRAM_BOT_TOKEN`  | Token du bot Telegram       |
| `TELEGRAM_CHAT_ID`    | ID du chat Telegram         |

## Utilisation

```bash
npm start
```

Le snapshot est écrit dans `output/snapshot-YYYY-MM-DD.json`.

## GitHub Actions

Le workflow s'exécute automatiquement à 07:00 et 19:00 (heure Algérienne).
Configurer les secrets dans Settings → Secrets and variables → Actions :

- `NOEST_EMAIL`
- `NOEST_PASSWORD`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
