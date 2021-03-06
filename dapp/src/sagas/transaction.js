import { call, put, fork, take, select } from 'redux-saga/effects'
import { eventChannel } from 'redux-saga'
import { processReceipt } from 'services/api/misc'
import { apiCall } from './utils'
import { sendTransactionHash } from 'actions/network'
import { getNetworkSide } from 'selectors/network'

import { transactionPending, transactionConfirmed, transactionFailed, transactionSucceeded } from 'actions/transactions'

export function * transactionFlow ({ transactionPromise, action, confirmationsLimit, sendReceipt, tokenAddress, abiName }) {
  if (confirmationsLimit) {
    yield fork(transactionConfirmations, { transactionPromise, action, confirmationsLimit })
  }

  const transactionHash = yield new Promise((resolve, reject) => {
    transactionPromise.on('transactionHash', (transactionHash) =>
      resolve(transactionHash)
    )
    transactionPromise.on('error', (error) => {
      const rejected = 'User denied transaction signature'
      if (((typeof error === 'string') && (error.includes(rejected))) ||
        ((typeof error.message === 'string') && error.message.includes(rejected))) {
        if (error.error) {
          error.error = rejected
          reject(error)
        } else {
          const err = 'User denied transaction signature'
          reject(err)
        }
      }
      reject(error)
    })
  })
  if (abiName) {
    yield put(sendTransactionHash(transactionHash, abiName))
  }
  yield put(transactionPending(action, transactionHash))
  const receipt = yield transactionPromise

  if (!Number(receipt.status)) {
    yield put(transactionFailed(action, receipt))
    return receipt
  }

  if (sendReceipt) {
    const bridgeType = yield select(getNetworkSide)
    yield apiCall(processReceipt, { receipt, bridgeType })
  }

  yield put(transactionSucceeded(action, receipt, { tokenAddress }))

  return receipt
}

function createConfirmationChannel (transactionPromise) {
  return eventChannel(emit => {
    const func = (confirmationNumber, receipt) => {
      emit({ receipt, confirmationNumber })
    }

    const emitter = transactionPromise.on('confirmation', func)

    const unsubscribe = () => {
      emitter.off('confirmation')
    }
    return unsubscribe
  })
}

export function * transactionConfirmations ({ confirmationsLimit, transactionPromise, action }) {
  const confirmationChannel = yield call(createConfirmationChannel, transactionPromise)

  let isWaiting = true
  while (isWaiting) {
    const { receipt, confirmationNumber } = yield take(confirmationChannel)
    yield put(transactionConfirmed(action, receipt, confirmationNumber))
    if (confirmationNumber > confirmationsLimit) {
      confirmationChannel.close()
      isWaiting = false
    }
  }
}
