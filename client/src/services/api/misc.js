import request from 'superagent'

export const API_ROOT = CONFIG.api.url.default

export const processReceipt = (receipt, apiRoot) =>
  request.post(`${apiRoot}/receipts/`).send({receipt}).then(response => response.body)

export const sendContactUs = (formData) => request.post(`${API_ROOT}/mails`)
  .send({formData})
  .then(response => response.body)

export const subcribeToMailingList = (formData) => request.post(`${API_ROOT}/subscriptions`)
  .send({formData})
  .then(response => response.body)

export const addUserInformation = (user, apiRoot) =>
  request.post(`${API_ROOT}/users`).send({user}).then(response => response.body)

const symbolToTickerId = {
  'CLN': 2753,
  'ETH': 1027
}

export const fetchTokenQuote = (symbol, currency) => request.get(
  `https://api.coinmarketcap.com/v2/ticker/${symbolToTickerId[symbol]}/?convert=${currency}`
).then(response => response.body)