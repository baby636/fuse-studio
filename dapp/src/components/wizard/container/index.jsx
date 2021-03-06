import React, { Fragment } from 'react'
import { withRouter } from 'react-router'
import { connect } from 'react-redux'
import { Form, Formik } from 'formik'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import inRange from 'lodash/inRange'
import omit from 'lodash/omit'
import Logo from 'components/common/Logo'
import classNames from 'classnames'
import ExitIcon from 'images/exit_icon.svg'
import TransactionButton from 'components/common/TransactionButton'
import { PENDING, FAILURE, REQUEST, SUCCESS } from 'actions/constants'
import { saveWizardProgress } from 'actions/user'
import { getAccount } from 'selectors/accounts'
import WizardShape from 'utils/validation/shapes/wizard'

const nextStepEvents = {
  0: 'Next step - 1',
  1: 'Next step - 2',
  2: 'Next step - 3',
  3: 'Next step - 4'
}

// the specific path for each page
const locations = [
  '/view/issuance',
  '/view/issuance/1',
  '/view/issuance/2',
  '/view/issuance/3',
  '/view/issuance/4'
]

const validations = {
  0: ['communityName', 'description', 'hasBalance', 'currency'],
  1: ['totalSupply', 'communitySymbol', 'images.chosen', 'communityType', 'existingToken', 'isOpen'],
  2: []
}

const wizardSteps = ['Economy name', 'Set up', 'Summary']

const StepsIndicator = ({ steps, activeStep }) => {
  return steps.map((item, index) => (
    <div
      key={index}
      className={classNames('cell large-2 medium-2 small-4 step', {
        'step--active': index === activeStep,
        'step--done': index < activeStep
      })}
    />
  ))
}

class Wizard extends React.Component {
  static Page = ({ children, ...rest }) => {
    return React.Children.map(children, child => React.cloneElement(child, { ...rest }))
  }

  constructor (props) {
    super(props)

    this.state = {
      page: 0,
      values: props.initialValues
    }
  }

  componentDidUpdate (prevProps) {
    if (this.props.transactionStatus === PENDING && prevProps.transactionStatus === REQUEST) {
      this.next(this.state.values)
    }
  }

  next = (values) => {
    const { saveWizardProgress, location, history } = this.props
    const page = locations.indexOf(location.pathname)
    saveWizardProgress({ ...omit(values, ['images', 'coverPhoto']), page })
    if (validations[page]) {
      const currentStepFields = validations[page]
      const trackProps = currentStepFields.reduce((acc, key) => {
        acc = values[key]
          ? {
              ...acc,
              [key]: get(values, `${key}.value`)
                ? `${get(values, `${key}.value`)}`
                : get(values, key)
            }
          : {
              ...acc
            }
        return acc
      }, {})
      if (window && window.analytics) {
        window.analytics.track(nextStepEvents[page], { ...trackProps })
      }

      if (page === 0 && values.email) {
        window.analytics.identify({ email: values.email })
      }
    }
    const nextPath = page + 1
    history.push(locations[nextPath])
  }

  handleBack = () => {
    const { location, history } = this.props
    const prevPath = locations.indexOf(location.pathname) - 1
    history.push(locations[prevPath])
  }

  handleOnSubmit = (values, bag) => {
    const { children, submitHandler, saveWizardProgress, location } = this.props
    const page = locations.indexOf(location.pathname)
    const isSubmitStep = get(React.Children.toArray(children)[page].props, 'isSubmitStep')

    if (isSubmitStep) {
      if (window && window.analytics) {
        window.analytics.track('Issue pressed')
      }
      saveWizardProgress({ ...omit(values, ['images', 'coverPhoto']), isSubmit: true, page })
      return submitHandler(values, bag)
    } else {
      bag.setTouched({})
      bag.setSubmitting(false)
      this.next(values)
    }
  }

  stepValidator = (keys, errors) => {
    if (!isEmpty(keys)) {
      return keys.some((key) => get(errors, key))
    }
    return false
  }

  renderForm = ({ values, errors, handleSubmit, isValid, touched }) => {
    const { children, transactionStatus, createTokenSignature, adminAddress, location } = this.props
    const page = locations.indexOf(location.pathname)
    const activePage = React.cloneElement(React.Children.toArray(children)[page], {
      setNextStep: () => this.next(values)
    })

    const isSubmitStep = get(React.Children.toArray(children)[page], 'props.isSubmitStep')
    return (
      <Form className={classNames('issuance__wizard', { 'issuance__wizard--opacity': ((createTokenSignature) || (transactionStatus === FAILURE)) })}>
        {page === 0 && <h1 className='issuance__wizard__title'>Launch your economy</h1>}
        {page === 1 && <h1 className='issuance__wizard__title'>Configure your {values.communityName} economy</h1>}
        {isSubmitStep && <h1 className='issuance__wizard__title'>Review and Sign</h1>}
        {activePage}
        <div className='issuance__wizard__buttons'>
          {page < 2 && (
            <div className='grid-x align-center next'>
              <button
                disabled={this.stepValidator(validations[page], errors) || isEmpty(touched)}
                onClick={() => this.next(values)}
                type='button'
                className='button button--normal'
              >
                Next
              </button>
            </div>
          )}
          {isSubmitStep && (
            <div className='grid-x align-center summary-step__issue'>
              <TransactionButton
                disabled={!isValid || !adminAddress}
                clickHandler={handleSubmit}
                type='submit'
                frontText='ISSUE'
              />
            </div>
          )}
          {inRange(page, 1, 5) && ((transactionStatus !== PENDING) && (transactionStatus !== SUCCESS) && (transactionStatus !== REQUEST)) && (
            <button
              type='button'
              className='issuance__wizard__back'
              onClick={this.handleBack}
            >
              Back
            </button>
          )}
        </div>
      </Form>
    )
  }

  render () {
    const { push, location } = this.props
    const { values } = this.state
    const page = locations.indexOf(location.pathname)

    return (
      <>
        <div className='issuance__wrapper'>
          <div className='issuance__header grid-x align-justify'>
            <div className='issuance__header__logo align-self-middle grid-x align-middle'>
              <Logo showHomePage={() => push('/')} isGradientLogo />
            </div>
            <div className='issuance__header__indicators grid-x cell align-center' ref={stepIndicator => (this.stepIndicator = stepIndicator)}>
              <div className='grid-y cell auto'>
                <h4 className='issuance__header__current'>{wizardSteps[page] || wizardSteps[page - 1]}</h4>
                <div className='grid-x align-center'>
                  <StepsIndicator
                    steps={wizardSteps}
                    activeStep={page}
                  />
                </div>
              </div>
            </div>
            <div
              onClick={() => push('/')}
              className='issuance__header__close align-self-middle grid-x align-middle align-right'
            >
              <img src={ExitIcon} />
            </div>
          </div>
          <Formik
            initialValues={values}
            onSubmit={this.handleOnSubmit}
            validationSchema={WizardShape}
            validateOnChange
            validateOnMount
          >
            {(props) => this.renderForm(props)}
          </Formik>
        </div>
      </>
    )
  }
}

const mapDispatchToProps = {
  saveWizardProgress
}

const mapState = (state) => ({
  account: getAccount(state)
})

export default connect(mapState, mapDispatchToProps)(withRouter(Wizard))
