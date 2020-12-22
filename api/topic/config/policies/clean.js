/**
 * Parse locale props for collection type.
 * Clear all props in other locales.
 * It parse recursively through both array and object values.
 * Default to "en" locale.
 */
const _ = require('lodash');
const Promise = require('bluebird');

const constitution_data = require('../../../../data/constitutions.json');


// @see https://stackoverflow.com/a/57227253/1490261
function isPureObject(input) {
  return (
    null !== input &&
    typeof input === "object" &&
    Object.getPrototypeOf(input).isPrototypeOf(Object)
  );
}

async function handleSubCategory(doc) {
  if (!doc.sub_category) {
    doc.category_id = '';
    doc.category_name = '';
    doc.category_color = '';

    doc.subcategory_id = '';
    doc.subcategory_code = '';
    doc.subcategory_name = '';

    return;
  }

  const cat = await strapi.query('category').findOne({ id: doc.sub_category.category });

  doc.category_id = cat ? cat.category_id : "?";
  doc.category_name = cat ? cat.name: "?";
  doc.category_color = cat ? cat.color : "#000000";

  doc.subcategory_id = doc.sub_category.sub_category_id;
  // doc.subcategory_code = doc.sub_category.sub_category_id;
  doc.subcategory_name = doc.sub_category.name;

  delete doc.sub_category;
}

async function handleConstitutions(doc) {
  doc.constitutions = _.compact(doc.constitutions.map(c => {
    const con = _.find(constitution_data, ['id', c.constitution_id]);
    if (!con) return null;

    const sections = _.compact(c.sections.map(s => s.section_id.trim()));
    return {
      id: con.id,
      name: con.name,
      prelude: con.prelude,
      sections: _.compact(sections.map(section_id => {
        const section = _.find(con.sections, ['id', Number(section_id)]);
        if (!section) return null;
        return {
          id: section.id,
          content: section.content,
          chapter_id: section.chapter_id,
          chapter_name: section.chapter_name,
          part_id: section.part_id,
          part_name: section.part_name
        };
      }))
    }
  }));
}

async function parseDocRecursive(doc, ctx, ...options) {
  if (!doc) return doc;
  // const props = Object.keys(doc);

  // Clean up system fields
  [
    // MongoDB
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    // Publshing feature
    "published_at"
  ].forEach(key => delete doc[key]);

  // Normalize Strappi media (image) fields
  const protocol = ctx.req.connection.encrypted ? 'https' : 'http';
  ["image", "thumbnail_image", "speaker_image"].forEach(key => {
    const image = doc[key];
    if (!image) return;
    // flatten sizes
    ["thumbnail", "large", "medium", "small"].forEach(size => {
      if (!_.get(image, `formats.${size}`)) return;
      doc[`${key}_${size}`] = `${protocol}://${ctx.request.header.host}${image.formats[size].url}`
    })
    // flatten normal size
    doc[`${key}`] = `${protocol}://${ctx.request.header.host}${image.url}`
  });

  //recursive for object and array type
  const compact_props = Object.keys(doc);
  // compact_props.forEach(prop => {
  for await (prop of compact_props) {
    if (Array.isArray(doc[prop])) {
      doc[prop] = await Promise.mapSeries(doc[prop], item => parseDocRecursive(item, ctx, ...options));
    }
    if (isPureObject(doc[prop])) {
      doc[prop] = await parseDocRecursive(doc[prop], ctx, ...options);
    }
  };

  return doc;
}

async function parseDoc(doc, ctx, ...options) {
  // Convert topic ID from number to string
  doc.id = String(doc.id);

  // Populate category from sub category
  await handleSubCategory(doc);
  // Populate constitution's section details
  await handleConstitutions(doc);

  await parseDocRecursive(doc, ctx, ...options);

  return doc;
}

module.exports = async (ctx, next) => {
  console.log("clean policy");

  await next();

  if (Array.isArray(ctx.response.body)) {
    // multiple docs
    // const result = ctx.response.body.map(doc => parseDoc(doc, ctx));
    const result = await Promise.mapSeries(ctx.response.body, doc => parseDoc(doc, ctx));
    ctx.response.body = result;
  } else {
    // single doc
    ctx.response.body = await parseDoc(ctx.response.body, ctx);
  }
};
