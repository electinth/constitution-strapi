/**
 * Populate topics inside category's sub categories.
 */
const _ = require('lodash');
const Promise = require('bluebird');

async function parseDoc(doc, ctx, ...options) {
  const all_topics = await Promise.all(doc.sub_categories.map(sub =>
    strapi.services.topic.find({
      sub_category: sub.id,
      _limit: 50,
      _sort: 'created_at:desc'
    })
  ));

  doc.sub_categories.forEach((sub, i) => {
    sub.topics = all_topics[i].map(topic => _.pick(topic, ['id', 'name', 'image', 'thumbnail_image']));
    sub.topics.forEach(topic => {
      // Convert topic ID from number to string
      topic.id = String(topic.id);
      // Normalize Strappi media (image) fields
      const protocol = ctx.req.connection.encrypted ? 'https' : 'http';
      ["image", "thumbnail_image", "speaker_image"].forEach(key => {
        const image = topic[key];
        if (!image) return;
        // // flatten sizes
        // ["thumbnail", "large", "medium", "small"].forEach(size => {
        //   if (!_.get(image, `formats.${size}`)) return;
        //   topic[`${key}_${size}`] = `${protocol}://${ctx.request.header.host}${image.formats[size].url}`
        // })
        // flatten normal size
        topic[`${key}`] = `${protocol}://${ctx.request.header.host}${image.url}`
      });
    })
  });

  return doc;
}

module.exports = async (ctx, next) => {
  // console.log("populateTopics policy");

  await next();

  if (Array.isArray(ctx.response.body)) {
    // multiple docs
    const result = await Promise.mapSeries(ctx.response.body, doc => parseDoc(doc, ctx));
    ctx.response.body = result;
  } else {
    // single doc
    ctx.response.body = await parseDoc(ctx.response.body, ctx);
  }
};
