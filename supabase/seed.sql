-- Datos semilla: los 11 productos de la referencia (resources/index/index.html). Idempotente:
-- solo inserta si la tabla está vacía. Las imágenes son las de public/img (rutas locales);
-- los productos nuevos que cargue el admin usan Supabase Storage.
insert into public.products (name, description, price, section, motive, image_url, sort_order)
select * from (values
  ('Caja Feliz Cumple',      'Mini torta con vela, medialunas, jugo exprimido, café, frutas y globo.',            32000, 'desayunos'::public.product_section, 'Cumpleaños',    '/img/cumple.png',          10),
  ('Caja Aniversario',       'Para dos: rosas, frutillas, cookies de corazón, espumante y café.',                 38000, 'desayunos', 'Aniversario',   '/img/aniversario.png',     20),
  ('Caja Peques',            'Chocolatada, cupcakes de colores, galletitas, golosinas y un juguete.',             28000, 'desayunos', 'Día del Niño',  '/img/nino.png',            30),
  ('Caja Papá',              'Café o mate, tostados de jamón y queso, brownie y cerveza artesanal.',              35000, 'desayunos', 'Día del Padre', '/img/padre.png',           40),
  ('Caja Buen Día',          'Yogur con granola, medialunas, jugo, frutas, miel y flores.',                       26000, 'desayunos', 'Otros motivos', '/img/buendia.png',         50),
  ('Torta Chocolate y DDL',  'Bizcochuelo de chocolate, dulce de leche y ganache. 12 porciones.',                 30000, 'tortas',    'Cumpleaños',    '/img/torta-chocolate.png', 10),
  ('Torta Frutos Rojos',     'Crema chantilly, frutillas, frambuesas y arándanos. 12 porciones.',                 34000, 'tortas',    'Aniversario',   '/img/torta-frutos.png',    20),
  ('Torta Arcoíris',         'Buttercream pastel, confites y decoración temática. 15 porciones.',                 33000, 'tortas',    'Infantil',      '/img/torta-infantil.png',  30),
  ('Alfajores artesanales',  'Caja x6: maicena con coco y bañados en chocolate.',                                  7500, 'dulces',    null,            '/img/alfajores.png',       10),
  ('Masitas finas',          'Surtido de ½ kg: rellenas, bañadas y de manteca.',                                   9000, 'dulces',    null,            '/img/masitas.png',         20),
  ('Pan casero',             'Hogaza de masa madre, horneada en el día. 700 g.',                                   4500, 'dulces',    null,            '/img/pan.png',             30)
) as v(name, description, price, section, motive, image_url, sort_order)
where not exists (select 1 from public.products);
