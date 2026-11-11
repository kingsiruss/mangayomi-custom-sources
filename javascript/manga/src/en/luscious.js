const mangayomiSources = [{
    "name": "Luscious",
    "lang": "en",
    "baseUrl": "https://www.luscious.net",
    "apiUrl": "https://members.luscious.net/graphql/nobatch/",
    "iconUrl": "https://www.luscious.net/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.3",
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

    getQueries() {
        return {
            AlbumListWithPeek: `query AlbumListWithPeek($input: AlbumListInput!) {
                album {
                    list(input: $input) {
                        info {
                            page
                            has_next_page
                            total_items
                            total_pages
                        }
                        items {
                            id
                            title
                            url
                            cover { url }
                        }
                    }
                }
            }`,
            AlbumGet: `query AlbumGet($id: ID!) {
                album {
                    get(id: $id) {
                        ... on Album {
                            id
                            title
                            description
                        }
                    }
                }
            }`,
            AlbumListOwnPictures: `query AlbumListOwnPictures($input: PictureListInput!) {
                picture {
                    list(input: $input) {
                        info {
                            has_next_page
                        }
                        items {
                            url_to_original
                        }
                    }
                }
            }`
        };
    }

    async graphql(operationName, variables = {}) {
        const queries = this.getQueries();
        const query = queries[operationName];
        if (!query) throw new Error("Unknown operation: " + operationName);

        const body = JSON.stringify({
            operationName: operationName,
            query: query,
            variables: variables
        });

        const url = this.source.apiUrl + "?operationName=" + encodeURIComponent(operationName);
        const res = await new Client().post(url, this.getHeaders(), body);
        const text = (res && res.body) ? res.body : "";

        if (!text || text.trim().startsWith("<")) {
            throw new Error("Luscious API returned HTML or empty. Starts with: " + text.substring(0, 100));
        }

        const data = JSON.parse(text);
        if (data.errors) {
            throw new Error("GraphQL error: " + JSON.stringify(data.errors));
        }
        return data;
    }

    async getPopular(page) {
        const variables = {
            input: {
                display: "rating_all_time",
                page: page || 1,
                filters: []
            }
        };
        const data = await this.graphql("AlbumListWithPeek", variables);
        return this.parseAlbums(data);
    }

    async getLatestUpdates(page) {
        const variables = {
            input: {
                display: "date_newest",
                page: page || 1,
                filters: []
            }
        };
        const data = await this.graphql("AlbumListWithPeek", variables);
        return this.parseAlbums(data);
    }

    async search(query, page, filters) {
        const variables = {
            input: {
                display: "search_score",
                search_query: query,
                page: page || 1,
                filters: []
            }
        };
        const data = await this.graphql("AlbumListWithPeek", variables);
        return this.parseAlbums(data);
    }

    parseAlbums(data) {
        const listData = data?.data?.album?.list || {};
        const items = listData.items || [];
        const hasNext = listData.info?.has_next_page || false;
        const list = items.map(a => ({
            name: a.title || "Untitled",
            link: a.url ? (a.url.startsWith("http") ? a.url : "https://members.luscious.net" + a.url) : `https://members.luscious.net/albums/${a.id}/`,
            imageUrl: a.cover?.url || ""
        }));
        return { list, hasNextPage: hasNext };
    }

    async getDetail(url) {
        const id = (url.match(/(\d+)/) || [])[1];
        if (!id) throw new Error("Could not extract album ID");

        const data = await this.graphql("AlbumGet", { id });
        const album = data?.data?.album?.get || {};
        return {
            name: album.title || "Unknown",
            description: album.description || "",
            status: 5,
            chapters: [{ name: "Album", url: url, dateUpload: Date.now().toString() }]
        };
    }

    async getPageList(url) {
        const id = (url.match(/(\d+)/) || [])[1];
        if (!id) return [];

        const variables = {
            input: {
                filters: [{ name: "album_id", value: id }],
                display: "position",
                page: 1
            }
        };
        const data = await this.graphql("AlbumListOwnPictures", variables);
        const pics = data?.data?.picture?.list?.items || [];
        return pics.map(p => p.url_to_original).filter(Boolean);
    }
}
