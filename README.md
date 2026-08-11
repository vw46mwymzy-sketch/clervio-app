# CLERVIO

CLERVIO centralise les achats, factures, garanties et abonnements dans un coffre privé, puis fait émerger la prochaine action utile.

## Exécution locale

L’application est une PWA statique sans étape de compilation.

```bash
npx serve .
```

Ouvrez ensuite l’URL affichée par le serveur. Le mode démonstration fonctionne sans compte et sans donnée partagée.

## Qualité

```bash
npm test
```

La commande valide la syntaxe de tous les scripts, les scripts inline, les fichiers JSON/CSS, les ressources locales, le moteur d’intelligence déterministe, la navigation, les garde-fous du scanner et l’app shell hors ligne.

## Architecture

- `index.html` : écrans et initialisation de session.
- `css/legendary.css` : fondation visuelle « Quiet Intelligence ».
- `js/01-nav.js` : routeur, historique interne, focus et événements de navigation.
- `js/28-intelligence.js` : calculs factuels et priorisation locale.
- `js/05-ai.js` / `js/12-concierge.js` : interface et passerelle du concierge.
- `js/06-scan.js` : analyse avec validation obligatoire avant conservation.
- `sw.js` : app shell hors ligne et notifications.

Les opérations sensibles restent protégées par l’authentification et les politiques RLS du projet Supabase. Toute évolution du schéma ou d’une Edge Function doit être versionnée et testée avec deux comptes adverses avant déploiement.
