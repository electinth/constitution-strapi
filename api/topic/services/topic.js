'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {

  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */
  find(params, populate) {
    console.log('FIND topic service');
    return strapi.query('topic').find(params, populate);
  },


  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */

  findOne(params, populate) {
    console.log('GET topic service');
    return strapi.query('topic').findOne(params, populate);
  },
};
