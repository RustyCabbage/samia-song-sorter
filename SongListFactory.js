import ARTIST_DATA from './artist_data.json' with { type: "json" };

class SongList {
  constructor(id, name, songs, theme) {
    this._id = id;
    this._name = name;
    this._songs = [...songs]; // Create a copy to avoid direct reference
    this._theme = theme; // Store theme references directly
    this._songCount = songs.length; // Pre-calculate song count
  }

  // Getters
  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  get songs() {
    return [...this._songs];
  } // Return a copy to prevent direct modification
  get theme() {
    return this._theme;
  }

  get songCount() {
    return this._songCount;
  }
}

class SongListRepository {
  constructor() {
    this._lists = new Map(); // Use Map instead of Object for better performance with key-value pairs
    this._listCache = null;
  }

  addList(songList) {
    if (!(songList instanceof SongList)) {
      throw new Error('Must be a SongList instance');
    }

    this._lists.set(songList.id, songList);
    this._listCache = null;
  }

  getList(id) {
    return this._lists.get(id) || null;
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

  return repo;
}

// Initialize the repository when the script loads
const songListRepo = initializeSongLists();

window.songListRepo = songListRepo;