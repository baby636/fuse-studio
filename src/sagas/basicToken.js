import { all, takeEvery, put, take, fork } from 'redux-saga/effects'

import * as actions from 'actions/basicToken'
import web3 from 'services/web3'
import { contract } from 'osseus-wallet'

const ColuLocalNetworkContract = contract.getContract('ColuLocalNetwork')

export function * name () {
  try {
    const data = yield ColuLocalNetworkContract.methods.name().call()
    yield put({type: actions.NAME.SUCCESS, data})
  } catch (error) {
    yield put({type: actions.NAME.FAILURE, error})
  }
}

export function * balanceOf (address) {
  try {
    const data = yield ColuLocalNetworkContract.methods.balanceOf(address).call()
    yield put({type: actions.BALANCE_OF.SUCCESS, data})
  } catch (error) {
    yield put({type: actions.BALANCE_OF.FAILURE, error})
  }
}

export function * transfer (to, value) {
  try {
    const receipt = yield ColuLocalNetworkContract.methods.transfer(to, value).send({
      from: web3.eth.defaultAccount
    })
    yield put({type: actions.BALANCE_OF.REQUEST, address: receipt.from})
    yield put({type: actions.TRANSFER.SUCCESS, receipt})
  } catch (error) {
    yield put({type: actions.TRANSFER.FAILURE, error})
  }
}

export function * watchBalanceOf () {
  while (true) {
    const {address} = yield take(actions.BALANCE_OF.REQUEST)
    yield fork(balanceOf, address)
  }
}

export function * watchName () {
  yield takeEvery(actions.NAME.REQUEST, name)
}

export function * watchTransfer () {
  while (true) {
    const {to, value} = yield take(actions.TRANSFER.REQUEST)
    yield fork(transfer, to, value)
  }
}

export function * watchTransferSuccess () {
  while (true) {
    const {receipt} = yield take(actions.TRANSFER.SUCCESS)
    yield put({type: actions.BALANCE_OF.REQUEST, address: receipt.from})
  }
}

export default function * rootSaga () {
  yield all([
    fork(watchName),
    fork(watchBalanceOf),
    fork(watchTransfer)
  ])
}