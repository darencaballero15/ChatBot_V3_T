
const axios = require('axios');
const https = require("https");
const timeTest = 1200000;
class RestApi {
  constructor(baseUrl, timeout = timeTest, headers = {}) {
    this.baseUrl = baseUrl;
  //  console.log('  this.baseUrl>>>',  this.baseUrl)
    this.instance = axios.create({ 
      baseURL: this.baseUrl,
      timeout: timeout,
      header: {
        "User-Agent": "Daren Caballero",
        "Cache-Control": "no-cache",
        "content-type": "application/json",
        Accept: "*/*",
        "X-Custom-Header": "foobar",
        ...headers,
        //'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        //'Authorization':'Bearer ' + token,
        //'X-Requested-With': 'XMLHttpRequest'

      },
    });
  }

  get(path = "", headers = {}, timeout = timeTest) {
    let url = `${this.baseUrl}${path}`;
    this.instance.defaults.timeout = timeout;
    return this.instance.get(url, {
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        ...headers,
      },
    });
  }

  post(path = "", body = {}, headers = {}, timeout = timeTest) {
    let url = `${this.baseUrl}${path}`;
    this.instance.defaults.timeout = timeout;
    return this.instance.post(url, body, {
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        ...headers,
      },
    });
  }

  put(path = "", body = {}, headers = {}, timeout = timeTest) {
    let url = `${this.baseUrl}${path}`;
    this.instance.defaults.timeout = timeout;
    return this.instance.put(url, body, {
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        ...headers,
      },
    });
  }

  remove(path = "", headers = {}, timeout = timeTest) {
    let url = `${this.baseUrl}${path}`;
    this.instance.defaults.timeout = timeout;
    return this.instance.delete(url, {
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        ...headers,
      },
    });
  }

  interceptorsRequest() {
    this.instance.interceptors.request.use(
      function (config) {
        console.log("3l config>>", config);
        console.log("intercepto requets");
        //config.headers = { ...config.headers, auth_token: getAuthToken() };
        // you can also do other modification in config
        return config;
      },
      function (error) {
        return Promise.reject(error);
      }
    );
  }

  interceptorsResponse() {
    this.instance.interceptors.response.use(
      function (response) {
        if (response.status === 401) {
          // your failure logic
        }
        return response;
      },
      function (error) {
        return Promise.reject(error);
      }
    );
  }
}

module.exports = RestApi;

