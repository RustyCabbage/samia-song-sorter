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

function addToRepoSamia(repository) {
  const samia = ARTIST_DATA.samia;

  const discographyList = [
    ...samia.songs.preBaby,
    ...samia.songs.theBaby,
    ...samia.songs.scout,
    "Desperado", "Born on a Train",
    ...samia.songs.honey,
    "Maps", "Country", "Making Breakfast",
    ...samia.songs.bloodless
  ];

  [
    new SongList("bloodless", "Bloodless", samia.songs.bloodless, samia.themes.bloodless),
    new SongList("honey", "Honey", samia.songs.honey, samia.themes.honey),
    new SongList("theBaby", "The Baby", samia.songs.theBaby, samia.themes.theBaby),
    new SongList("discography", "Samia Discography", discographyList, samia.themes.scout)
  ].forEach(list => repository.addList(list));
}

function initializeSongLists() {
  const repo = new SongListRepository();

  addToRepoSamia(repo);
  //repo.addList(new SongList("torchiepo", "The Tortured Poets Department", ARTIST_DATA.taylor_swift.songs.torchiepo, ARTIST_DATA.samia.themes.bloodless));

  return repo;
}

// Initialize the repository when the script loads
export const songListRepo = initializeSongLists();