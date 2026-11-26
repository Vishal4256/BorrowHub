import mongoose from 'mongoose';

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function (coords) {
          if (!coords || coords.length === 0) return true;
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return (
            typeof lng === 'number' &&
            typeof lat === 'number' &&
            Number.isFinite(lng) &&
            Number.isFinite(lat) &&
            lng >= -180 &&
            lng <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] with valid geographic bounds.'
      }
    }
  },
  { _id: false }
);

export const locationSubSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    coordinates: {
      type: geoPointSchema,
      default: undefined
    }
  },
  { _id: false }
);
