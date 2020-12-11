'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  /**
   * Retrieve records by category ID.
   *
   * @return {Array}
   */

  async findByCategory(ctx) {
    const { category_id } = ctx.params;

    const cat = await strapi.query('category').findOne({ category_id: category_id });
    if (!cat) return [];

    const subcat = await strapi.query('sub-category').find({ category: cat.id });
    if (!subcat) return [];

    const subcat_ids = subcat.map(s => s.id);
    ctx.query.sub_category_in = subcat_ids;

    let entities;
    entities = await strapi.services.topic.find(ctx.query);

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.topic }));
  },
};
