DELETE FROM switch.category;
DELETE FROM switch.field;
DELETE FROM switch.field_category;

INSERT INTO switch.category
(name, category_order)
VALUES
('Brand', 1),
('Construction', 2),
('Materials', 3),
('Appearance', 4),
('Spring', 5),
('Sound and Feel', 6),
('Purchasing', 7),
('Media', 8);

INSERT INTO switch.field
(name, type, json)
VALUES
('Name', 'text', null),
('Series', 'text', null),
('Manufacturer', 'text', null),
('Type', 'select', '{ "options": [ "linear", "tactile", "clicky" ] }'),
('Mount', 'select', '{ "options": [ "plate", "pcb" ] }'),
('Top Material', 'select', '{ "options": [ "ABS", "Polycarbonate (PC)", "POM", "UHMWPE", "Other" ] }'),
('Bottom Material', 'select', '{ "options": [ "ABS", "Polycarbonate (PC)", "POM", "UHMWPE", "Other" ] }'),
('Stem Material', 'select', '{ "options": [ "ABS", "Polycarbonate (PC)", "POM", "UHMWPE", "Other" ] }'),
('Top Color', 'color', null),
('Bottom Color', 'color', null),
('Stem Color', 'color', null),
('Actuation (g)', 'number', null),
('Bottom-Out (g)', 'number', null),
('Pre-Travel (mm)', 'number', null),
('Total Travel (mm)', 'number', null),
('Bottom-Out Sound', 'slider', '{ "minValue": "Low Pitched", "maxValue": "High Pitched" }'),
('Top-Out Sound', 'slider', '{ "minValue": "Low Pitched", "maxValue": "High Pitched" }'),
('Smoothness', 'slider', '{ "minValue": "Scratchy", "maxValue": "Smooth" }'),
('Price', 'number', null),
('Listings', 'list', null),
('Photos', 'list', null),
('Videos', 'list', null);

INSERT INTO switch.field_category
(categoryid, fieldid, field_order)
VALUES
((SELECT categoryid FROM switch.category WHERE name='Brand'), (SELECT fieldid FROM switch.field WHERE name='Name'), 1),
((SELECT categoryid FROM switch.category WHERE name='Brand'), (SELECT fieldid FROM switch.field WHERE name='Series'), 2),
((SELECT categoryid FROM switch.category WHERE name='Brand'), (SELECT fieldid FROM switch.field WHERE name='Manufacturer'), 3),
((SELECT categoryid FROM switch.category WHERE name='Construction'), (SELECT fieldid FROM switch.field WHERE name='Type'), 1),
((SELECT categoryid FROM switch.category WHERE name='Construction'), (SELECT fieldid FROM switch.field WHERE name='Mount'), 2),
((SELECT categoryid FROM switch.category WHERE name='Materials'), (SELECT fieldid FROM switch.field WHERE name='Top Material'), 1),
((SELECT categoryid FROM switch.category WHERE name='Materials'), (SELECT fieldid FROM switch.field WHERE name='Bottom Material'), 2),
((SELECT categoryid FROM switch.category WHERE name='Materials'), (SELECT fieldid FROM switch.field WHERE name='Stem Material'), 3),
((SELECT categoryid FROM switch.category WHERE name='Appearance'), (SELECT fieldid FROM switch.field WHERE name='Top Color'), 1),
((SELECT categoryid FROM switch.category WHERE name='Appearance'), (SELECT fieldid FROM switch.field WHERE name='Bottom Color'), 2),
((SELECT categoryid FROM switch.category WHERE name='Appearance'), (SELECT fieldid FROM switch.field WHERE name='Stem Color'), 3),
((SELECT categoryid FROM switch.category WHERE name='Spring'), (SELECT fieldid FROM switch.field WHERE name='Actuation (g)'), 1),
((SELECT categoryid FROM switch.category WHERE name='Spring'), (SELECT fieldid FROM switch.field WHERE name='Bottom-Out (g)'), 2),
((SELECT categoryid FROM switch.category WHERE name='Spring'), (SELECT fieldid FROM switch.field WHERE name='Pre-Travel (mm)'), 3),
((SELECT categoryid FROM switch.category WHERE name='Spring'), (SELECT fieldid FROM switch.field WHERE name='Total Travel (mm)'), 4),
((SELECT categoryid FROM switch.category WHERE name='Sound and Feel'), (SELECT fieldid FROM switch.field WHERE name='Bottom-Out Sound'), 1),
((SELECT categoryid FROM switch.category WHERE name='Sound and Feel'), (SELECT fieldid FROM switch.field WHERE name='Top-Out Sound'), 2),
((SELECT categoryid FROM switch.category WHERE name='Sound and Feel'), (SELECT fieldid FROM switch.field WHERE name='Smoothness'), 3),
((SELECT categoryid FROM switch.category WHERE name='Purchasing'), (SELECT fieldid FROM switch.field WHERE name='Price'), 1),
((SELECT categoryid FROM switch.category WHERE name='Purchasing'), (SELECT fieldid FROM switch.field WHERE name='Listings'), 2),
((SELECT categoryid FROM switch.category WHERE name='Media'), (SELECT fieldid FROM switch.field WHERE name='Photos'), 1),
((SELECT categoryid FROM switch.category WHERE name='Media'), (SELECT fieldid FROM switch.field WHERE name='Videos'), 2);

SELECT c.categoryid, c.name AS "category_name", f.fieldid, f.name as "field_name", f.type, f.json
FROM switch_old.category c
JOIN switch_old.field_category fc ON fc.categoryid = c.categoryid
JOIN switch_old.field f on f.fieldid = fc.fieldid
ORDER BY c.category_order, fc.field_order;


DELETE FROM switch.switch;
DELETE FROM switch.value;

-- actuation -> operating (g)
-- pre-travel -> operating
-- pre-travel? - tactile only?
