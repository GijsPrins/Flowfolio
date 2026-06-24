# Flowfolio

Een simpele prive-app om zelf bij te houden waar geld staat: betaalrekening, spaargeld, contant, Vinted en andere potjes. Flowfolio gebruikt geen bankkoppeling. Je vult per potje snapshots in; de app toont het huidige totaal, de potjes, verschil met de vorige meting en een grafiek per potje.

## Stack

- Vite + React + TypeScript
- Firebase Authentication
- Cloud Firestore
- Recharts
- GitHub Pages via GitHub Actions

## Lokaal starten

```bash
npm install
cp .env.example .env
npm run dev
```

Vul eerst `.env` met je Firebase web-app config. Zonder die config toont de app alleen een koppelmelding.

## Firebase aanmaken

1. Ga naar [Firebase Console](https://console.firebase.google.com/) en maak een project.
2. Zet Google Analytics uit als je dat niet nodig hebt.
3. Voeg een web-app toe via Project settings > General > Your apps.
4. Kopieer de configwaarden naar `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Zet Authentication aan:
   - Build > Authentication > Get started
   - Sign-in method > Email/password > Enable
6. Zet Firestore aan:
   - Build > Firestore Database > Create database
   - Kies production mode
   - Kies een regio
7. Plaats de regels uit `firestore.rules` in Firestore > Rules en publiceer ze.

Met deze regels mag iedere ingelogde gebruiker alleen eigen data lezen en schrijven onder `users/{uid}`.

## GitHub Pages deploy

1. Maak een GitHub repository, bijvoorbeeld `FlowFolio`.
2. Push deze map naar `main`.
3. Ga in GitHub naar Settings > Secrets and variables > Actions.
4. Voeg deze repository secrets toe:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

5. Ga naar Settings > Pages.
6. Zet Source op GitHub Actions.
7. Push naar `main` of start de workflow handmatig.
8. Voeg je GitHub Pages domein toe in Firebase Authentication > Settings > Authorized domains.

Bij een repository met de naam `FlowFolio` bouwt Vite automatisch met base path `/FlowFolio/`.

## Firestore structuur

```txt
users/{uid}/pots/{potId}
  name
  currency
  icon
  color
  note
  kind
  archivedAt
  createdAt
  updatedAt

users/{uid}/pots/{potId}/snapshots/{snapshotId}
  amountCents
  measuredAt
  note
  createdAt
  updatedAt
  deletedAt
```

Bedragen worden opgeslagen in centen, dus `1234` betekent `EUR 12,34`.

## Beschikbaar in deze eerste versie

- Account maken en inloggen met e-mail/wachtwoord
- Potje toevoegen
- Potje hernoemen/bewerken
- Actueel bedrag bijwerken via snapshots
- Huidige som van alle actieve potjes
- Verschil met vorige meting
- Grafiek per potje
- Snapshots corrigeren of soft-deleten
- Potjes archiveren en herstellen
- Voorbeelddata laden bij een leeg account

## Handige scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```
