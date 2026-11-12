import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { Hero } from "@/components/store/Hero";
import { ProductSection } from "@/components/store/ProductSection";
import { getCatalog } from "@/lib/catalog";
import { MIN_LEAD_HOURS } from "@/lib/config";
import { groupBySection } from "@/lib/domain/catalog";

export default async function Home() {
  const bySection = groupBySection(await getCatalog());

  return (
    <>
      <Header />
      <main id="inicio">
        <div className="wrap">
          <Hero />
          <ProductSection
            id="desayunos"
            title="Cajas de desayuno"
            subtitle="Elegí el motivo y sorprendé a quien más querés."
            products={bySection.desayunos}
            filterable
            filterLabel="Filtrar desayunos por motivo"
          />
          <ProductSection
            id="tortas"
            title="Tortas"
            subtitle={`Por encargo, con ${MIN_LEAD_HOURS} h de anticipación.`}
            products={bySection.tortas}
            filterable
            filterLabel="Filtrar tortas por motivo"
          />
          <ProductSection
            id="dulces"
            title="Dulces y panificados"
            subtitle="Alfajores, masitas y pan casero del día."
            products={bySection.dulces}
          />
          <div className="band">
            <div>
              <h2>¿Querés algo a medida?</h2>
              <p>Armamos cajas personalizadas con tu mensaje, colores y productos favoritos.</p>
            </div>
            <button className="btn btn-primary">Ir al carrito</button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
