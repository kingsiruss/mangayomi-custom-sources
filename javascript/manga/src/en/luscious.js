const mangayomiSources = [{
    "name": "Luscious",
    "lang": "en",
    "baseUrl": "https://www.luscious.net",
    "apiUrl": "https://www.luscious.net/graphql/nobatch/",
    "iconUrl": "https://www.luscious.net/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.0",
    "isNsfw": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/kingsiruss/mangayomi-custom-sources/main/javascript/manga/src/en/luscious.js",
    "sourceCodeLanguage": 1
}];

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "Referer": this.source.baseUrl,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        };
    }

    async graphql(query, variables = {}) {
        const res = await new Client().post(this.source.apiUrl, this.getHeaders(), JSON.stringify({ query, variables }));
        return JSON.parse(res.body);
    }

    async getPopular(page) {
        const query = `query AlbumList($input: AlbumListInput!) { album { list(input: $input) { items { id title url cover { url } } info { has_next_page } } } }`;
        const variables = { input: { display: "rating_all_time", page, items_per_page: 30 } };
        const data = await this.graphql(query, variables);
        return this.parseAlbums(data);
    }

    async getLatestUpdates(page) {
        const query = `query AlbumList($input: AlbumListInput!) { album { list(input: $input) { items { id title url cover { url } } info { has_next_page } } } }`;
        const variables = { input: { display: "date_trending", page, items_per_page: 30 } };
        const data = await this.graphql(query, variables);
        return this.parseAlbums(data);
    }

    async search(query, page, filters) {
        const q = `query AlbumList($input: AlbumListInput!) { album { list(input: $input) { items { id title url cover { url } } info { has_next_page } } } }`;
        const variables = { input: { display: "search_score", search_query: query, page, items_per_page: 30 } };
        const data = await this.graphql(q, variables);
        return this.parseAlbums(data);
    }

    parseAlbums(data) {
        const items = data?.data?.album?.list?.items || [];
        const hasNext = data?.data?.album?.list?.info?.has_next_page || false;
        const list = items.map(a => ({
            name: a.title,
            link: a.url || `/albums/${a.id}/`,
            imageUrl: a.cover?.url || ""
        }));
        return { list, hasNextPage: hasNext };
    }

    async getDetail(url) {
        const id = url.match(/\d+/)?.[0];
        const query = `query AlbumGet($id: ID!) { album { get(id: $id) { title description pictures { items { url_to_original } } } } }`;
        const data = await this.graphql(query, { id });
        const album = data?.data?.album?.get || {};
        return {
            name: album.title || "Unknown",
            description: album.description || "",
            status: 5,
            chapters: [{ name: "Album", url: url, dateUpload: Date.now().toString() }]
        };
    }

    async getPageList(url) {
        const id = url.match(/\d+/)?.[0];
        const query = `query AlbumGet($id: ID!) { album { get(id: $id) { pictures { items { url_to_original } } } } }`;
        const data = await this.graphql(query, { id });
        const pics = data?.data?.album?.get?.pictures?.items || [];
        return pics.map(p => p.url_to_original).filter(Boolean);
    }
}
