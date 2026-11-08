/**
 * Entry point.
 *
 * Provider makes the Redux store available everywhere (that is why
 * useSelector works without passing the store down as a prop), and
 * BrowserRouter enables routing. Order matters: Provider outside Router
 * outside App.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'

import store from './store/store'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
