# Truchement

Module Foundry VTT v14 qui traduit en français, à l'import, le contenu créé par Plutonium.

Aucun texte traduit n'est distribué : la traduction se fait localement, chez chaque MJ, sur ce qu'il importe.

## Installation

Dans Foundry, *Modules complémentaires → Installer un module*, coller le lien du manifeste :

```
https://github.com/quill-and-seal/Truchement/releases/latest/download/module.json
```

## Fonctionnement

À la création d'un objet, d'un acteur (avec ses objets embarqués) ou d'un journal, Truchement traduit le nom et la description, puis met à jour le document. Le texte anglais d'origine est conservé dans `flags.truchement.original`.

**Badge d'état** dans l'en-tête de chaque fiche (acteur, objet, journal) :

- grisé : non traduit — un clic lance la traduction ;
- **FR** (vert) : traduction affichée — un clic affiche la version d'origine ;
- **EN** (orange) : version d'origine affichée — un clic revient à la traduction.

La bascule s'applique aussi aux objets d'un acteur et aux pages d'un journal, sans relancer le modèle. Seul le MJ peut cliquer.

**Maj+clic** sur le badge : retraduire depuis la version d'origine (utile après une mise à jour du module).

**Alt+clic** sur un libellé traduit de l'interface (MJ) : saisir sa traduction à la main. La correction est enregistrée dans le monde, partagée avec les joueurs, et prime sur le modèle.

Un libellé traduit trop long pour sa place est réduit (jusqu'à 70 %), puis coupé avec « … » ; le texte complet reste en infobulle.

Quand le badge est sur **FR**, toute la fiche passe en français, **interface comprise** (libellés, onglets, infobulles, boutons). Seul l'affichage change ; en mode EN la fiche revient entièrement en anglais. Seuls les libellés d'interface connus de Foundry (cœur, système, modules) sont traduits à l'affichage ; le contenu de la fiche (noms, descriptions) n'est jamais retraité par cette partie. L'infobulle des objets suit aussi le mode FR. Pour l'interface, Truchement utilise en priorité les fichiers de langue français des modules installés (traductions du cœur de Foundry et du système dnd5e), même si Foundry reste en anglais, puis le modèle pour le reste. Installer ces modules de traduction améliore nettement les libellés courts.

Réglages :

- **Traduction automatique** — active ou coupe la traduction à l'import.
- **Uniquement les imports Plutonium** — ne traduit que les documents portant les flags de Plutonium.
- **Traduire l'interface des fiches** — traduit aussi les libellés de la fiche quand le badge est sur FR (réglage par joueur).
- **Afficher l'équivalent des distances** — affiche en petit la distance dans l'unité opposée (réglage par joueur).

API, depuis une macro :

```js
const api = game.modules.get("truchement").api;
await api.translateDocument(item);  // traduire un document existant
await api.toggleDocument(item);     // basculer traduction ↔ version d'origine
api.stateOf(item);                  // "none", "fr" ou "en"
```

## Moteur de traduction

Aucun dictionnaire : chaque phrase passe par trois couches.

1. **Cache** — phrases déjà traduites, rempli automatiquement et conservé dans le navigateur (`src/nmt/client.js`).
2. **Gabarits de règles** — phrases formulaires (jets de sauvegarde, dégâts, soins, montée en niveau, formules des blocs de stats) reconnues par regex et reconstruites par algorithme, avec accords et genre (`src/engine/patterns.js`).
3. **Modèle neuronal** — tout le reste : prose, noms, fragments. Modèle Marian `opus-mt-en-fr` exécuté localement avec transformers.js, dans un worker pour ne pas figer Foundry (`src/nmt/worker.js`).

Au premier usage, le modèle (~75 Mo) est téléchargé une fois puis mis en cache par le navigateur. Si le modèle est indisponible, seules les phrases de règles sont traduites.

Les jets en ligne (`[[/attack]]`, `[[/damage …]]`), les liens `@UUID[…]` et les balises HTML ne sont jamais modifiés ; seul leur libellé `{…}` est traduit.

Les distances restent dans l'unité du texte source, avec l'équivalent dans l'unité opposée affiché en petit (calcul exact, 1 pied = 0,3048 m).

## Tester le moteur

```sh
node test/run.mjs
```

Le banc d'essai utilise un faux modèle : il vérifie les gabarits, le cache, la protection des jets en ligne et l'annotation des distances.

## Historique

Voir [CHANGELOG.md](CHANGELOG.md).

## Publier une version

Ajouter la version dans `CHANGELOG.md`, puis créer une release GitHub avec un tag `vX.Y.Z` : le workflow `release.yml` met à jour le manifeste et attache `module.json` et `module.zip`.
