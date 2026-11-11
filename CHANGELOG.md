# Historique des versions

Toutes les évolutions notables de Truchement.

Numérotation : le dernier chiffre change pour les ajouts et corrections, le chiffre du milieu pour les mises à jour majeures.

Lien du manifeste : https://github.com/quill-and-seal/Truchement/releases/latest/download/module.json

## 0.2.23

### Changements
- **Les compendiums déjà traduits sont ignorés.** Un objet, un acteur ou une page qui vient d'un compendium traduit n'est plus touché, même si la traduction n'est que partielle (seulement le nom, par exemple). Un compendium est reconnu comme traduit s'il passe par Babele, si les noms de son index sont en français, ou dès qu'un de ses documents contient un champ en français. Vaut aussi pour les objets embarqués d'un acteur.

## 0.2.22

### Corrections
- **Les fiches sans texte à traduire passent quand même en FR.** Une fiche de personnage vide ou au nom propre (« Kallias »), ou dont tout le contenu est déjà en français, restait sur « non traduit » avec l'avertissement « Rien de reconnu à traduire », et l'interface (compétences, sauvegardes, onglets…) n'était donc jamais traduite. Le badge passe maintenant sur **FR** et l'interface est traduite ; le message devient une simple information.

## 0.2.21

### Corrections
- **Le français n'est plus retraduit en français.** Détection de langue (mots-outils, accents, orthographe) :
  - un document déjà en français (compendium traduit, saisie en français) est laissé tel quel ;
  - les documents traduits par Babele (`flags.babele.translated`) sont ignorés ;
  - dans un document mélangé, les phrases déjà en français ne passent pas par le modèle ;
  - un nom présent parmi les traductions du glossaire est reconnu comme français.

## 0.2.20

### Corrections
- **Modèle retéléchargé à chaque chargement** quand Foundry est ouvert en `http://` (adresse IP du réseau local) : le cache du navigateur n'existe pas sur une page non sécurisée. Le modèle est désormais gardé dans IndexedDB dans ce cas.
- La notification « téléchargement du modèle » ne s'affiche plus que lors d'un vrai téléchargement, pas quand le modèle est lu depuis le cache. La console indique d'où il vient (`truchement | modèle prêt …`).

## 0.2.19

### Corrections
- **Thème de Foundry abîmé après un signalement** (fiche délavée jusqu'au rechargement F5) : la bibliothèque de capture réinjectait le contenu des `@import` dans les feuilles de style de la page pour retrouver les polices. Truchement lui fournit désormais lui-même les polices utilisées par la fiche ; les feuilles de style de la page ne sont plus modifiées.
- **Icônes en carrés** sur les captures : les polices d'icônes sont maintenant embarquées.

## 0.2.18

### Corrections
- **Fiche délavée après un signalement** (et capture EN délavée) : la fenêtre de remarque faisait passer la fiche en arrière-plan. Elle est maintenant remise au premier plan avant chaque capture et à la fin du signalement.

## 0.2.17

### Corrections
- **Captures vides** dans les signalements : la fenêtre, positionnée à l'écran, était dessinée hors du cadre de l'image. La capture se fait désormais sur une copie hors écran ramenée en position 0,0.
- La fenêtre affichée n'est plus touchée pendant la capture (elle pouvait rester délavée après un signalement).

## 0.2.16

### Nouveautés
- Le relais de signalement est en service : adresse par défaut `https://truchement.argannao.com`. Le bouton drapeau fonctionne sans aucune configuration.

## 0.2.15

### Nouveautés
- **Bouton drapeau** (MJ) dans l'en-tête des fiches : signaler un problème de traduction. Capture de la fiche en FR et en EN, envoi avec les textes, les versions et une remarque.
- **Relais de signalement** (dépôt privé `truchement-reports`, Docker, mise à jour automatique) : dépose les captures dans le dépôt privé `truchement-reports` et crée l'issue `[Traduction] Nom — Type`, ou ajoute un commentaire si elle existe déjà. Le jeton GitHub reste sur le serveur ; limite d'envois par adresse IP.
- Réglage « Adresse du relais de signalement ».

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
