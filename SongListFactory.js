import ARTIST_DATA from './artist_data.json' with {type: "json"};

class SongList {
  constructor(id, artist, name, songs, theme) {
    this._id = id;
    this._artist = artist;
    this._name = name;
    this._songs = [...songs]; // Create a copy to avoid direct reference
    this._theme = theme; // Store theme references directly
    this._songCount = songs.length; // Pre-calculate song count
  }

  // Getters
  get id() {
    return this._id;
  }

  get artist() {
    return this._artist;
  }

  get name() {
    return this._name;
  }

  get songs() {
    return [...this._songs];
  }

  get theme() {
    return this._theme;
  }

  get songCount() {
    return this._songCount;
  }
}

class SongListRepository {
  constructor() {
    this._lists = new Map();
    this._listCache = null;
    this._artistCache = null;
  }

  addList(songList) {
    if (!(songList instanceof SongList)) {
      throw new Error('Must be a SongList instance');
    }

    this._lists.set(songList.id, songList);
    this._listCache = null;
    this._artistCache = null;
  }

  getList(id) {
    return this._lists.get(id) || null;
  }

  getListsByArtist(artist) {
    return Array.from(this._lists.values())
      .filter(list => list.artist === artist)
      .map(list => ({id: list.id, name: list.name}));
  }

  getAllLists() {
    if (this._listCache) {
      return this._listCache;
    }

    this._listCache = Array.from(this._lists.entries()).map(([id, list]) => ({
      id, name: list.name
    }));

    return this._listCache;
  }

  getAllArtists() {
    if (this._artistCache) {
      return this._artistCache;
    }

    this._artistCache = [...new Set(Array.from(this._lists.values()).map(list => list.artist))];
    return this._artistCache;
  }
}

function addToRepoSamia(repository, artist = "Samia") {
  const samia = ARTIST_DATA.samia;
  const songs = samia.songs;
  const themes = samia.themes

  const discographyList = [
    ...songs.preBaby,
    ...songs.theBaby,
    ...songs.scout,
    "Desperado", "Born on a Train",
    ...songs.honey,
    "Maps", "Country", "Making Breakfast",
    ...songs.bloodless
  ];

  [
    new SongList("bloodless", artist, "Bloodless", songs.bloodless, themes.bloodless),
    new SongList("honey", artist, "Honey", songs.honey, themes.honey),
    new SongList("theBaby", artist, "The Baby", songs.theBaby, themes.theBaby),
    new SongList("samia_discography", artist, "Samia Discography", discographyList, themes.scout)
  ].forEach(list => repository.addList(list));
}

function addToRepoTaylor(repository, artist = "Taylor Swift") {
  const taylor = ARTIST_DATA.taylor_swift;
  const songs = taylor.songs;

  const discographyList = [
    ...songs.debut,
    ...songs.fearless,
    "Crazier",
    ...songs.speakNow,
    "Safe & Sound",
    "Eyes Open",
    ...songs.red,
    "Sweeter Than Fiction",
    ...songs.album1989,
    ...songs.reputation,
    ...songs.lover,
    "All Of The Girls You Loved Before",
    "Christmas Tree Farm",
    "Macavity",
    "Beautiful Ghosts",
    "Only The Young",
    ...songs.folklore,
    ...songs.evermore,
    "Carolina",
    ...songs.midnights,
    ...songs.torchiepo,
  ];

  [
    new SongList("torchiepo", artist, "The Tortured Poets Department", songs.torchiepo, ARTIST_DATA.samia.themes.bloodless),
    new SongList("midnights", artist, "Midnights", songs.midnights, ARTIST_DATA.samia.themes.bloodless),
    new SongList("evermore", artist, "Evermore", songs.evermore, ARTIST_DATA.samia.themes.bloodless),
    new SongList("folklore", artist, "Folklore", songs.folklore, ARTIST_DATA.samia.themes.bloodless),
    new SongList("lover", artist, "Lover", songs.lover, ARTIST_DATA.samia.themes.bloodless),
    new SongList("reputation", artist, "Reputation", songs.reputation, ARTIST_DATA.samia.themes.bloodless),
    new SongList("album1989", artist, "1989", songs.album1989, ARTIST_DATA.samia.themes.bloodless),
    new SongList("red", artist, "Red", songs.red, ARTIST_DATA.samia.themes.bloodless),
    new SongList("speakNow", artist, "Speak Now", songs.speakNow, ARTIST_DATA.samia.themes.bloodless),
    new SongList("fearless", artist, "Fearless", songs.fearless, ARTIST_DATA.samia.themes.bloodless),
    new SongList("debut", artist, "Debut", songs.debut, ARTIST_DATA.samia.themes.bloodless),
    new SongList("taylor_discography", artist, "Taylor Discography", discographyList, ARTIST_DATA.samia.themes.bloodless),
  ].forEach(list => repository.addList(list));
}

function initializeSongLists() {
  const repo = new SongListRepository();

  addToRepoSamia(repo);
  addToRepoTaylor(repo);

  return repo;
}

// Initialize the repository when the script loads
export const songListRepo = initializeSongLists();