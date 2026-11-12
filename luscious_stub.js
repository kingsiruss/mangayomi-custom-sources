const mangayomiSources = [{
    "name": "Luscious",
    "lang": "en",
    "baseUrl": "https://www.luscious.net",
    "iconUrl": "https://www.luscious.net/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.0",
    "isNsfw": true,
    "sourceCodeUrl": "https://kingsiruss.github.io/mangayomi-custom-sources/luscious_stub.js",
    "sourceCodeLanguage": 1
}];

class DefaultExtension extends MProvider {
    async getPopular(page) {
        return { list: [], hasNextPage: false };
    }
    async getLatestUpdates(page) {
        return { list: [], hasNextPage: false };
    }
    async search(query, page, filters) {
        return { list: [], hasNextPage: false };
    }
    async getDetail(url) {
        return { name: "Test", chapters: [] };
    }
    async getPageList(url) {
        return [];
    }
}
