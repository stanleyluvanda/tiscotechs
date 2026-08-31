// src/data/usStateUniversityGroups.js

export const US_STATE_UNIVERSITIES = {
  Alabama: [
    "University of Alabama",
    "Auburn University",
    "The University of Alabama at Birmingham",
    "The University of Alabama in Huntsville",
    "University of South Alabama",
  ],

  Alaska: [
    "University of Alaska Fairbanks",
    "Alaska Pacific University",
    "University of Alaska Southeast",
    "Alaska Bible College",
    "University of Alaska Anchorage",
    ],

  Arizona: [
    "Arizona Christian University",
  ],

 Arkansas: [
  "University of Arkansas",
  ],

  Delaware: [
  "University of Delaware",
  "Delaware State University",
  
  ],

"Washington D.C": [
  "American University",
  
  ],
Florida: [
  "AdventHealth University",
  
  ],
Georgia : [
  "Georgia Institute of Technology",
  
  ],



};

export const US_UNIVERSITY_STATE_SEPARATORS = Object.fromEntries(
  Object.entries(US_STATE_UNIVERSITIES).flatMap(([state, universities]) =>
    universities.map((uni, index) => [uni, index === 0 ? state : null])
  )
);