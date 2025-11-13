const express = require("express");
const cors = require("cors");
const path = require("path");
const { Database, aql } = require("arangojs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve public folder

// Connect to ArangoDB
const db = new Database({ url: "http://localhost:8529" });
db.useBasicAuth("root", "root");

const dbName = "watchme";
let watchme;

// Movies data
const movies = [
  { title: "Inception", director: "Christopher Nolan", genre: "Sci-Fi", poster: "https://a.ltrbxd.com/resized/sm/upload/sv/95/s9/4j/inception-0-2000-0-3000-crop.jpg?v=30d7224316" },
  { title: "The Dark Knight", director: "Christopher Nolan", genre: "Action", poster: "https://a.ltrbxd.com/resized/sm/upload/78/y5/zg/ej/oefdD26aey8GPdx7Rm45PNncJdU-0-2000-0-3000-crop.jpg?v=2d0ce4be25" },
  { title: "Tenet", director: "Christopher Nolan", genre: "Action", poster: "https://a.ltrbxd.com/resized/sm/upload/pq/9f/sr/vt/aCIFMriQh8rvhxpN1IWGgvH0Tlg-0-2000-0-3000-crop.jpg?v=f3165fe17f" },
  { title: "Oppenheimer", director: "Christopher Nolan", genre: "Biography", poster: "https://a.ltrbxd.com/resized/film-poster/7/8/4/3/2/8/784328-oppenheimer-0-2000-0-3000-crop.jpg?v=e3c6e7a32c" },
  { title: "Pulp Fiction", director: "Quentin Tarantino", genre: "Crime", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/4/4/4/51444-pulp-fiction-0-2000-0-3000-crop.jpg?v=dee19a8077" },
  { title: "Django Unchained", director: "Quentin Tarantino", genre: "Western", poster: "https://a.ltrbxd.com/resized/film-poster/5/2/5/1/6/52516-django-unchained-0-2000-0-3000-crop.jpg?v=f02aed63a3" },
  { title: "Kill Bill Vol.1", director: "Quentin Tarantino", genre: "Action", poster: "https://a.ltrbxd.com/resized/sm/upload/sw/w2/ep/v4/9O50TVszkz0dcP5g6Ej33UhR7vw-0-2000-0-3000-crop.jpg?v=5a65f5202f" },
  { title: "Inglourious Basterds", director: "Quentin Tarantino", genre: "War", poster: "https://a.ltrbxd.com/resized/film-poster/4/1/3/5/2/41352-inglourious-basterds-0-2000-0-3000-crop.jpg?v=0c74c673e0" },
  { title: "The Matrix", director: "The Wachowskis", genre: "Sci-Fi", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/5/1/8/51518-the-matrix-0-2000-0-3000-crop.jpg?v=fc7c366afe" },
  { title: "Gladiator", director: "Ridley Scott", genre: "Action", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/9/5/2/51952-gladiator-2000-0-2000-0-3000-crop.jpg?v=0071a74571" },
  { title: "The Godfather", director: "Francis Ford Coppola", genre: "Crime", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/8/1/8/51818-the-godfather-0-2000-0-3000-crop.jpg?v=bca8b67402" },
  { title: "The Shawshank Redemption", director: "Frank Darabont", genre: "Drama", poster: "https://a.ltrbxd.com/resized/sm/upload/7l/hn/46/uz/zGINvGjdlO6TJRu9wESQvWlOKVT-0-2000-0-3000-crop.jpg?v=8736d1c395" },
  { title: "Forrest Gump", director: "Robert Zemeckis", genre: "Drama", poster: "https://a.ltrbxd.com/resized/film-poster/2/7/0/4/2704-forrest-gump-0-2000-0-3000-crop.jpg?v=173bc04cf0" },
  { title: "The Matrix Resurrections", director: "The Wachowskis", genre: "Action", poster: "https://a.ltrbxd.com/resized/film-poster/5/5/1/2/7/5/551275-the-matrix-resurrections-0-2000-0-3000-crop.jpg?v=dcca87ec62" }
];

// Initialize database
(async () => {
  const databases = await db.listDatabases();
  if (!databases.includes(dbName)) await db.createDatabase(dbName);
  watchme = db.database(dbName);
  await setupCollections();
  await seedData();
})();

// Setup collections
async function setupCollections() {
  const collections = ["Movies", "Directors", "Genres", "DIRECTED", "BELONGS_TO"];
  for (const name of collections) {
    const coll = watchme.collection(name);
    if (!(await coll.exists())) {
      if (name === "DIRECTED" || name === "BELONGS_TO") await coll.create({ type: 3 });
      else await coll.create();
    }
  }
}

// Seed movies and relationships
async function seedData() {
  const movieColl = watchme.collection("Movies");
  const directorColl = watchme.collection("Directors");
  const genreColl = watchme.collection("Genres");
  const directEdge = watchme.collection("DIRECTED");
  const belongsEdge = watchme.collection("BELONGS_TO");

  for (const m of movies) {
    const movieKey = m.title.replace(/\s+/g, "_");
    const dirKey = m.director.replace(/\s+/g, "_");
    const genreKey = m.genre.replace(/\s+/g, "_");

    await movieColl.save({ _key: movieKey, ...m }).catch(() => {});
    await directorColl.save({ _key: dirKey, name: m.director }).catch(() => {});
    await genreColl.save({ _key: genreKey, name: m.genre }).catch(() => {});
    await directEdge.save({ _from: `Directors/${dirKey}`, _to: `Movies/${movieKey}` }).catch(() => {});
    await belongsEdge.save({ _from: `Movies/${movieKey}`, _to: `Genres/${genreKey}` }).catch(() => {});
  }
}

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Get all movies
app.get("/all", async (req, res) => {
  const cursor = await watchme.query(aql`FOR m IN Movies RETURN m`);
  const all = await cursor.all();
  res.json(all);
});

// Get movie + related
app.get("/related/:title", async (req, res) => {
  const titleKey = req.params.title.replace(/\s+/g, "_");
  const query = aql`
    LET mainMovie = DOCUMENT(CONCAT("Movies/", ${titleKey}))
    LET directorMovies = (
      FOR d IN INBOUND CONCAT("Movies/", ${titleKey}) DIRECTED
        FOR m IN OUTBOUND d DIRECTED
        FILTER m._key != ${titleKey}
        RETURN DISTINCT m
    )
    LET genreMovies = (
      FOR g IN OUTBOUND CONCAT("Movies/", ${titleKey}) BELONGS_TO
        FOR m IN INBOUND g BELONGS_TO
        FILTER m._key != ${titleKey}
        RETURN DISTINCT m
    )
    RETURN { main: mainMovie, byDirector: directorMovies, byGenre: genreMovies }
  `;
  const cursor = await watchme.query(query);
  const result = await cursor.next();
  res.json(result);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
