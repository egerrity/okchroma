import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import UnifyCompare from './unify-compare/UnifyCompare'

// #/unify-compare is an ORPHANED exhibit (owner-bookmarked; linked from nowhere)
const orphan = window.location.hash.startsWith('#/unify-compare')
createRoot(document.getElementById('root')!).render(orphan ? <UnifyCompare /> : <App />)
