-- Agregar figuritas Coca-Cola / Latin America al álbum 2026
-- Seguro para correr sin tocar la colección existente
--
-- ⚠️  PASO 1: correr esto primero (solo esta línea) y hacer Run
--     alter type sticker_category add value if not exists 'coca-cola';
--
-- ⚠️  PASO 2: después de que el PASO 1 commitee, correr el resto del script

update albums set total_stickers = 994 where year = 2026;

insert into stickers (album_id, number, label, team, category) values
('a2026000-0000-0000-0000-000000000000','CC1','Lamine Yamal',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC2','Joshua Kimmich',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC3','Harry Kane',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC4','Santiago Giménez',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC5','Josko Gvardiol',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC6','Federico Valverde',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC7','Jefferson Lerma',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC8','Enner Valencia',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC9','Gabriel Magalhães',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC10','Virgil van Dijk',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC11','Alphonso Davies',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC12','Emiliano Martinez',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC13','Raúl Jiménez',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC14','Lautaro Martínez',null,'coca-cola')
on conflict do nothing;
