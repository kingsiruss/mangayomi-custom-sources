const mangayomiSources = [{
    "name": "Luscious",
    "lang": "en",
    "baseUrl": "https://www.luscious.net",
    "apiUrl": "https://members.luscious.net/graphql/nobatch/",
    "iconUrl": "https://www.luscious.net/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.2",
    "isNsfw": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/kingsiruss/mangayomi-custom-sources/main/javascript/manga/src/en/luscious.js",
    "sourceCodeLanguage": 1
}];

class DefaultExtension extends MProvider {
    getHeaders() {
        return {
            "Referer": "https://members.luscious.net/",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Origin": "https://members.luscious.net"
        };
    }

    async graphql(operationName, query, variables = {}) {
        const body = JSON.stringify({ operationName, query, variables });
        const url = this.source.apiUrl + "?operationName=" + encodeURIComponent(operationName);
        const res = await new Client().post(url, this.getHeaders(), body);
        const text = res.body || "";
        if (text.trim().startsWith("<")) {
            throw new Error("Luscious API returned HTML (blocked or wrong endpoint). Body starts with: " + text.substring(0, 80));
        }
        return JSON.parse(text);
    }

    async getPopular(page) {
        const query = `query AlbumListWithPeek($input: AlbumListInput!) {
            album {
                list(input: $input) {
                    info { has_next_page }
                    items { id title url cover { url } }
                }
            }
        }`;
        const variables = { input: { display: "rating_all_time", page: page || 1, items_per_page: 30 } };
        const data = await this.graphql("AlbumListWithPeek", query, variables);
        return this.parseAlbums(data);
    }

    async getLatestUpdates(page) {
        const query = `query AlbumListWithPeek($input: AlbumListInput!) {
            album {
                list(input: $input) {
                    info { has_next_page }
                    items { id title url cover { url } }
                }
            }
        }`;
        const variables = { input: { display: "date_newest", page: page || 1, items_per_page: 30 } };
        const data = await this.graphql("AlbumListWithPeek", query, variables);
        return this.parseAlbums(data);
    }

    async search(query, page, filters) {
        const q = `query AlbumListWithPeek($input: AlbumListInput!) {
            album {
                list(input: $input) {
                    info { has_next_page }
                    items { id title url cover { url } }
                }
            }
        }`;
        const variables = { input: { display: "search_score", search_query: query, page: page || 1, items_per_page: 30 } };
        const data = await this.graphql("AlbumListWithPeek", q, variables);
        return this.parseAlbums(data);
    }

    parseAlbums(data) {
        const items = data?.data?.album?.list?.items || [];
        const hasNext = data?.data?.album?.list?.info?.has_next_page || false;
        const list = items.map(a => ({
            name: a.title || "Untitled",
            link: a.url ? (a.url.startsWith("http") ? a.url : "https://www.luscious.net" + a.url) : `https://www.luscious.net/albums/${a.id}/`,
            imageUrl: a.cover?.url || ""
        }));
        return { list, hasNextPage: hasNext };
    }

    async getDetail(url) {
        const id = url.match(/(\d+)/)?.[1];
        const query = `query AlbumGet($id: ID!) {
            album { get(id: $id) { title description } }
        }`;
        const data = await this.graphql("AlbumGet", query, { id });
        const album = data?.data?.album?.get || {};
        return {
            name: album.title || "Unknown",
            description: album.description || "",
            status: 5,
            chapters: [{ name: "Album", url: url, dateUpload: Date.now().toString() }]
        };
    }

    async getPageList(url) {
        const id = url.match(/(\d+)/)?.[1];
        const query = `query PictureList($input: PictureListInput!) {
            picture {
                list(input: $input) {
                    items { url_to_original }
                    info { has_next_page }
                }
            }
        }`;
        const variables = {
            input: {
                filters: [{ name: "album_id", value: id }],
                display: "position",
                page: 1,
                items_per_page: 100
            }
        };
        const data = await this.graphql("PictureList", query, variables);
        const pics = data?.data?.picture?.list?.items || [];
        return pics.map(p => p.url_to_original).filter(Boolean);
    }
}
