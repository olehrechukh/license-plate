import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Provinces from './pages/Provinces.jsx'
import Province from './pages/Province.jsx'
import Comments from './pages/Comments.jsx'
import Rankings from './pages/Rankings.jsx'
import PlateDetail from './pages/PlateDetail.jsx'
import NewComment from './pages/NewComment.jsx'
import Terms from './pages/Terms.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'

// Routes mirror feed.sitemap.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/provinces" element={<Provinces />} />
        <Route path="/provinces/:slug" element={<Province />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/plate/:plate" element={<PlateDetail />} />
        <Route path="/new-comment" element={<NewComment />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
