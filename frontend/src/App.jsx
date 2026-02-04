import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState("Łączenie z backendem...")

  useEffect(() => {
    // Sprawdzamy czy backend żyje pod adresem z Twojego docker-compose
    fetch("http://localhost:8000/docs") 
      .then(res => {
        if(res.ok) setStatus("✅ Połączono z Backendem!")
        else setStatus("❌ Backend odpowiedział błędem")
      })
      .catch(err => setStatus("❌ Brak połączenia: " + err.message))
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Nauka App - Frontend</h1>
      <p style={{ fontSize: '1.2rem', color: status.includes('✅') ? 'green' : 'red' }}>
        {status}
      </p>
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <p>Jeśli widzisz zielony napis, oznacza to, że CORS i Docker działają!</p>
      </div>
    </div>
  )
}

export default App
