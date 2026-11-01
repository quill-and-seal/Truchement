# Historique des versions

Toutes les évolutions notables de Truchement.

Numérotation : le dernier chiffre change pour les ajouts et corrections, le chiffre du milieu pour les mises à jour majeures.

Lien du manifeste : https://github.com/quill-and-seal/Truchement/releases/latest/download/module.json

## 0.2.14

### Corrections
- **Import Plutonium** : Truchement traduisait le document provisoire (« Importing... ») et écrasait le vrai nom. Il attend désormais que l'import soit terminé (1,5 s sans modification) avant de traduire, et vérifie que rien n'a changé pendant la traduction avant d'écrire.
- Les textes ajoutés par Plutonium après la création (langues, sens…) sont maintenant traduits.

### Nouveautés
- Glossaire : armes, armures, équipement courant, catégories d'armes (Courante, De guerre), quelques créatures (270 termes).

## 0.2.13

### Nouveautés
- Section `expressions` du glossaire (52 expressions) : termes protégés à l'intérieur des phrases envoyées au modèle, puis remis en français (« Dexterity saving throw » → « jet de sauvegarde de Dextérité »). Le modèle ne peut plus retraduire un terme du glossaire au milieu d'une phrase.
- Repli automatique si le modèle perd un marqueur : la phrase est renvoyée avec le terme français écrit dedans.

## 0.2.12

### Nouveautés
- Glossaire `data/glossaire.json` (177 termes, 6 formules) prioritaire sur le modèle : interface de fiche, déplacements et sens, tailles, types de créatures, alignements, caractéristiques, compétences, dégâts, états, langues, capacités courantes.
- Noms composés « X (Y) » traduits partie par partie.
- Les corrections Alt+clic s'appliquent aussi au contenu (noms, libellés).

## 0.2.11

### Corrections
- La traduction de l'interface abîmait des noms déjà traduits (« Rayon (en anglais) »). Elle ne touche plus que les libellés connus de Foundry, du système et des modules ; le contenu de la fiche n'est plus retraité.

### Nouveautés
- Libellés composés (« Natural • Action ») traduits morceau par morceau.
- Infobulles des objets traduites quand on survole une fiche en FR.

## 0.2.10

### Nouveautés
- Correction à la main d'un libellé traduit par Alt+clic (MJ), enregistrée dans le monde et prioritaire sur le modèle.
- Libellés trop longs ajustés à la place disponible (police réduite, puis « … » avec infobulle).

## 0.2.9

### Corrections
- En repassant en EN, l'interface pouvait être retraduite juste après la restauration. Tout passage en attente est annulé à la bascule.

## 0.2.8

### Corrections
- Mode EN : l'interface de la fiche revient entièrement en anglais.
- Abréviations des caractéristiques (STR, DEX…) jamais traduites.

## 0.2.7

### Corrections
- Garde-fous contre les boucles : sorties du modèle normalisées, un texte n'est jamais envoyé deux fois au modèle, disjoncteur au-delà de 30 passages en 5 secondes.

## 0.2.6

### Corrections
- Compatibilité Tidy5e (fiches réactives) : la fiche est suivie en mode FR et chaque élément redessiné est retraduit.

## 0.2.5

### Nouveautés
- Interface des fiches traduite en mode FR (libellés, onglets, infobulles, boutons), à partir des fichiers de langue français installés puis du modèle.
- Réglage « Traduire l'interface des fiches ».

## 0.2.4

### Nouveautés
- Textes libres des acteurs traduits : langues, sens spéciaux, immunités, résistances et vulnérabilités personnalisées.

## 0.2.3

### Corrections
- « (round down) » et « (round up) » traduits par « (arrondi à l'inférieur) » et « (arrondi au supérieur) ».

## 0.2.2

### Nouveautés
- Gabarits pour les blocs de stats : jet d'attaque, touché / échec, portée et allonge, dégâts typés, bonus d'attaque des sorts, dés + niveau du sort.
- Libellés des jets en ligne (`[[/attack]]{…}`) traduits, commande intacte.
- Maj+clic sur le badge : retraduire depuis la version d'origine.

### Corrections
- Les gabarits passent avant le cache des traductions du modèle.

## 0.2.1

### Nouveautés
- Badge d'état dans l'en-tête des fiches (non traduit / FR / EN).
- Bascule en un clic entre la traduction et la version d'origine, objets et pages compris.

## 0.2.0 — Traduction par modèle neuronal

### Nouveautés
- Modèle `opus-mt-en-fr` exécuté localement (transformers.js, dans un worker).
- Suppression des dictionnaires : seuls les gabarits de règles et le modèle traduisent.
- Cache des traductions dans le navigateur ; repli sur les gabarits si le modèle est indisponible.

## 0.1.2

### Nouveautés
- Traduction par fragments des blocs de stats.
- Jets en ligne protégés.

### Corrections
- Bouton « Traduire » fiabilisé, notification systématique.

## 0.1.1

### Nouveautés
- Bouton « Traduire » pour les documents existants.
- Logs de diagnostic dans la console.

### Corrections
- Réglages affichés en français.

## 0.1.0 — Première version

- Traduction automatique à l'import des objets, acteurs et journaux.
- Moteur en couches : mémoire, gabarits, dictionnaire.
- Distances conservées en pieds avec l'équivalent en mètres en petit.
- Texte d'origine conservé dans les flags.
