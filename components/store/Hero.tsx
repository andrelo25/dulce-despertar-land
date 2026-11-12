import Image from "next/image";

export function Hero() {
  return (
    <>
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
          <Image
            src="/img/hero.png"
            alt="Caja de desayuno abierta con medialunas, frutas, jugo, café y alfajores"
            width={1408}
            height={768}
            sizes="(min-width: 900px) 600px, 100vw"
            priority
          />
        </div>
      </section>

      <ol className="steps" aria-label="Cómo pedir">
        <li><b>1</b>Elegí tus productos y sumalos al carrito</li>
        <li><b>2</b>Completá tus datos y el horario de entrega</li>
        <li><b>3</b>Te confirmamos por WhatsApp en menos de 30 min</li>
        <li><b>4</b>Pagás y recibís tu pedido</li>
      </ol>
    </>
  );
}
