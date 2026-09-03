/**
 * Careers listing controller — fetches Lever postings and renders grouped job listings.
 *
 * attribute contract:
 *   [dev-target="department-group"] — department section template
 *   [dev-target="career-item"]      — individual job row template
 *   [dev-target="career-list"]      — container for job rows within a department
 *   [dev-target="career-role"]      — job title in a career item
 *   [dev-target="career-city"]      — location in a career item
 */

const API_ENDPOINT = 'https://api.lever.co/v0/postings/payjoy?mode=json&group=department';

type FilterCategory = 'department' | 'location' | 'title';

interface LeverPostingCategories {
  department?: string;
  location?: string;
  title?: string;
  allLocations?: string[];
  [key: string]: string | string[] | undefined;
}

interface LeverPosting {
  text: string;
  hostedUrl: string;
  categories: LeverPostingCategories;
}

interface LeverDepartment {
  title?: string;
  postings: LeverPosting[];
}

export class CareersController {
  private readonly apiUrl = new URL(API_ENDPOINT);
  private allJobsData: LeverDepartment[] = [];
  private resultListWrapper: HTMLElement | null = null;
  private departmentTemplate: HTMLElement | null = null;
  private careerItemTemplate: HTMLElement | null = null;
  private deptDropdown: Element | null = null;
  private locationDropdown: Element | null = null;
  private titleDropdown: Element | null = null;

  async init(): Promise<void> {
    const searchForm = document.querySelector("form[data-name='Email Form']");
    this.resultListWrapper = document.querySelector('.careers-list');
    this.departmentTemplate = document.querySelector("[dev-target='department-group']");
    this.careerItemTemplate = document.querySelector("[dev-target='career-item']");

    const filterDropdowns = document.querySelectorAll('.dropdown.w-dropdown');
    this.deptDropdown = filterDropdowns[0] ?? null;
    this.locationDropdown = filterDropdowns[1] ?? null;
    this.titleDropdown = filterDropdowns[2] ?? null;

    this.departmentTemplate?.remove();
    this.careerItemTemplate?.remove();

    if (!this.resultListWrapper) return;
    if (!this.departmentTemplate) {
      console.error('department-group template not found');
      return;
    }
    if (!this.careerItemTemplate) {
      console.error('career-item template not found');
      return;
    }

    searchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    let jobsData: LeverDepartment[];
    try {
      jobsData = await this.fetchData(this.apiUrl);
      this.allJobsData = jobsData;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    this.populateDropdown(this.deptDropdown, jobsData, 'department', 'Region: All');
    this.populateDropdown(this.locationDropdown, jobsData, 'location', 'Location');
    this.populateDropdown(this.titleDropdown, jobsData, 'title', 'Job title');

    this.applyFilters();

    const searchBtn = document.querySelector('.button-main-wrap .clickable_btn');
    searchBtn?.addEventListener('click', () => this.applyFilters());
  }

  private applyFilters(): void {
    const filtered = this.filterJobs(this.allJobsData);
    this.renderJobs(filtered);
  }

  private filterJobs(data: LeverDepartment[]): LeverDepartment[] {
    const selectedDept = this.getSelectedValue(this.deptDropdown);
    const selectedLocation = this.getSelectedValue(this.locationDropdown);
    const selectedTitle = this.getSelectedValue(this.titleDropdown);

    return data
      .filter((department) => !selectedDept || department.title === selectedDept)
      .map((department) => ({
        ...department,
        postings: department.postings.filter((posting) => {
          if (selectedLocation && !this.matchesLocation(posting, selectedLocation)) return false;
          if (selectedTitle && posting.text !== selectedTitle) return false;
          return true;
        }),
      }))
      .filter((department) => department.postings.length > 0);
  }

  private matchesLocation(posting: LeverPosting, location: string): boolean {
    const { location: primaryLocation, allLocations } = posting.categories;

    return primaryLocation === location || (allLocations?.includes(location) ?? false);
  }

  private async fetchData(url: URL): Promise<LeverDepartment[]> {
    if (!this.resultListWrapper) return [];

    this.resultListWrapper.innerHTML = '<p>Loading...</p>';
    const res = await fetch(url);
    return res.json() as Promise<LeverDepartment[]>;
  }

  private renderJobs(data: LeverDepartment[]): void {
    if (!this.resultListWrapper || !this.departmentTemplate || !this.careerItemTemplate) return;

    this.resultListWrapper.innerHTML = '';

    if (!data || data.length === 0) {
      this.resultListWrapper.innerHTML = '<p>No roles found.</p>';
      return;
    }

    data.forEach((department) => {
      const deptGroup = this.departmentTemplate!.cloneNode(true) as HTMLElement;
      deptGroup.removeAttribute('dev-target');

      const deptName = deptGroup.querySelector('.career_dept_name h1, h1.u-heading');
      if (deptName) deptName.textContent = department.title ?? 'Uncategorized';

      const careerList = deptGroup.querySelector("[dev-target='career-list']");
      if (careerList) careerList.innerHTML = '';

      department.postings.forEach((posting) => {
        const item = this.careerItemTemplate!.cloneNode(true) as HTMLElement;
        item.removeAttribute('dev-target');

        const roleEl = item.querySelector('[dev-target="career-role"]');
        if (roleEl) {
          roleEl.innerHTML = `<strong>${posting.text}</strong>`;
        } else {
          console.error('career role not found');
        }

        const cityEl = item.querySelector('[dev-target="career-city"]');
        if (cityEl) {
          cityEl.textContent =
            posting.categories.allLocations?.join(', ') ?? posting.categories.location ?? '';
        } else {
          console.error('career city not found');
        }

        const btn = item.querySelector('.clickable_btn');
        const btnText = item.querySelector('.button-main-text');
        if (btnText) btnText.textContent = 'Learn More';
        if (btn) {
          btn.addEventListener('click', () => window.open(posting.hostedUrl, '_blank'));
        }

        if (careerList) careerList.appendChild(item);
        else deptGroup.appendChild(item);
      });

      this.resultListWrapper!.appendChild(deptGroup);
    });
  }

  private populateDropdown(
    dropdownEl: Element | null,
    jobsData: LeverDepartment[],
    category: FilterCategory,
    placeholder: string
  ): void {
    if (!dropdownEl) return;

    if (dropdownEl instanceof HTMLElement) {
      dropdownEl.dataset.filterPlaceholder = placeholder;
    }

    const nav = dropdownEl.querySelector('.w-dropdown-list');
    if (!nav) return;

    const values = new Set<string>();
    jobsData.forEach((dept) => {
      dept.postings.forEach((posting) => {
        if (category === 'title') {
          values.add(posting.text);
          return;
        }

        if (category === 'location') {
          const { location, allLocations } = posting.categories;
          if (location) values.add(location);
          allLocations?.forEach((loc) => values.add(loc));
          return;
        }

        const val = posting.categories[category];
        if (typeof val === 'string') values.add(val);
      });
    });

    nav.innerHTML = '';

    const resetLink = document.createElement('a');
    resetLink.href = '#';
    resetLink.className = 'w-dropdown-link';
    resetLink.textContent = placeholder;
    resetLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.setDropdownLabel(dropdownEl, placeholder);
      this.applyFilters();
    });
    nav.appendChild(resetLink);

    Array.from(values)
      .sort()
      .forEach((val) => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'w-dropdown-link';
        link.textContent = val;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.setDropdownLabel(dropdownEl, val);
          this.applyFilters();
        });
        nav.appendChild(link);
      });
  }

  private setDropdownLabel(dropdownEl: Element, label: string): void {
    const text = dropdownEl.querySelector('.fitler-dropdown-text-wrapper .text-size-regular');
    if (text) text.textContent = label;

    const toggle = dropdownEl.querySelector('.w-dropdown-toggle');
    if (toggle instanceof HTMLElement) toggle.dataset.selected = label;
    if (dropdownEl instanceof HTMLElement) dropdownEl.dataset.selected = label;
  }

  private getSelectedValue(dropdownEl: Element | null): string | null {
    if (!(dropdownEl instanceof HTMLElement)) return null;

    const toggle = dropdownEl.querySelector('.w-dropdown-toggle');
    const val =
      (toggle instanceof HTMLElement ? toggle.dataset.selected : undefined) ??
      dropdownEl.dataset.selected;
    const placeholder = dropdownEl.dataset.filterPlaceholder;

    return val && val !== placeholder ? val : null;
  }
}
