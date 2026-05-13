-- Agregar figuritas Coca-Cola / Latin America al álbum 2026
-- Seguro para correr sin tocar la colección existente

-- Agregar valor al enum (idempotente)
do $$ begin
  alter type sticker_category add value if not exists 'coca-cola';
exception when others then null;
end $$;

update albums set total_stickers = 994 where year = 2026;

insert into stickers (album_id, number, label, team, category) values
('a2026000-0000-0000-0000-000000000000','CC-LAM1','Lamine Yamal',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM2','Joshua Kimmich',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM3','Harry Kane',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM4','Santiago Giménez',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM5','Josko Gvardiol',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM6','Federico Valverde',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM7','Jefferson Lerma',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM8','Enner Valencia',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM9','Gabriel Magalhães',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM10','Virgil van Dijk',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM11','Alphonso Davies',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM12','Emiliano Martinez',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM13','Raúl Jiménez',null,'coca-cola'),
('a2026000-0000-0000-0000-000000000000','CC-LAM14','Lautaro Martínez',null,'coca-cola')
on conflict do nothing;
