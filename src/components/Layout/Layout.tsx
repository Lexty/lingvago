import { Outlet, useLocation } from 'react-router'
import NavBar from '../NavBar/NavBar'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  const isStudy = location.pathname.startsWith('/study')

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <Outlet />
      </main>
      {!isStudy && <NavBar />}
    </div>
  )
}
