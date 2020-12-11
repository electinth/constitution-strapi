/**
 * Parse locale props for collection type.
 * Clear all props in other locales.
 * It parse recursively through both array and object values.
 * Default to "en" locale.
 */

// @see https://stackoverflow.com/a/57227253/1490261
function isPureObject(input) {
  return (
    null !== input &&
    typeof input === "object" &&
    Object.getPrototypeOf(input).isPrototypeOf(Object)
  );
}

function pasreLocaleProp(doc, ...options) {
  // const props = Object.keys(doc);

  [
    // MongoDB
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    // Publshing feature
    "published_at"
  ].forEach(key => delete doc[key]);

  //recursive for object and array type
  const compact_props = Object.keys(doc);
  compact_props.forEach(prop => {
    if (Array.isArray(doc[prop])) {
      doc[prop] = doc[prop].map(item => pasreLocaleProp(item, ...options));
    }
    if (isPureObject(doc[prop])) {
      doc[prop] = pasreLocaleProp(doc[prop], ...options);
    }
  });

  return doc;
}

module.exports = async (ctx, next) => {
  console.log("clean policy");

  await next();

  if (Array.isArray(ctx.response.body)) {
    // multiple docs
    const result = ctx.response.body.map(doc => pasreLocaleProp(doc));
    ctx.response.body = result;
  } else {
    // single doc
    ctx.response.body = pasreLocaleProp(ctx.response.body);
  }
};
