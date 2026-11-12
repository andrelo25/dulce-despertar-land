import Image from "next/image";

// Página TEMPORAL de T2 para comparar estilos con la referencia. T7 la reemplaza.
export default function Home() {
  return (
    <>
      <header>
        <div className="wrap bar">
          <a href="#inicio" className="logo">
            <span aria-hidden="true"></span>Buen Día
          </a>
          <nav aria-label="Secciones">
            <ul>
              <li><a href="#desayunos">Desayunos</a></li>
              <li><a href="#tortas">Tortas</a></li>
              <li><a href="#dulces">Dulces</a></li>
            </ul>
          </nav>
          <button className="cart-btn" aria-haspopup="dialog">
            Carrito <span className="count" aria-live="polite">0</span>
            <span className="sr-only">productos</span>
          </button>
        </div>
      </header>

      <main id="inicio">
        <div className="wrap">
          <section className="hero">
            <div>
              <span className="eyebrow">Hecho a mano, cada mañana</span>
              <h1>Desayunos que dicen <em>te quiero</em> sin decir una palabra.</h1>
              <p>Cajas de desayuno personalizadas para cumpleaños, aniversarios y fechas especiales. Además, tortas por encargo y dulces artesanales recién horneados.</p>
              <div className="cta-row">
                <a href="#desayunos" className="btn btn-primary">Ver desayunos</a>
                <a href="#tortas" className="btn btn-ghost">Tortas por encargo</a>
              </div>
            </div>
            <div className="hero-img">
              <Image src="/img/hero.png" alt="Caja de desayuno abierta con medialunas, frutas, jugo, café y alfajores" width={1408} height={768} priority />
            </div>
          </section>

          <ol className="steps" aria-label="Cómo pedir">
            <li><b>1</b>Elegí tus productos y sumalos al carrito</li>
            <li><b>2</b>Completá tus datos y el horario de entrega</li>
            <li><b>3</b>Te confirmamos por WhatsApp en menos de 30 min</li>
            <li><b>4</b>Pagás y recibís tu pedido</li>
          </ol>

          <section className="cat" id="desayunos" aria-labelledby="h-des">
            <div className="sec-head">
              <div><h2 id="h-des">Cajas de desayuno</h2><p>Elegí el motivo y sorprendé a quien más querés.</p></div>
              <div className="chips" role="group" aria-label="Filtrar desayunos por motivo">
                <button className="chip" aria-pressed="true">Todos</button>
                <button className="chip" aria-pressed="false">Cumpleaños</button>
              </div>
            </div>
            <div className="grid">
              <article className="card">
                <div className="ph">
                  <Image src="/img/cumple.png" alt="" width={1024} height={1024} />
                  <span className="tag">Cumpleaños</span>
                </div>
                <div className="body">
                  <h3>Producto de ejemplo</h3>
                  <p className="desc">Tarjeta de verificación de estilos (T2).</p>
                  <div className="foot">
                    <span className="price">$ 18.500</span>
                    <button className="add">Agregar</button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
