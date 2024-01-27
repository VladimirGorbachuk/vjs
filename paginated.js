const ENDPOINT = "https://api.slingacademy.com/v1/sample-data/users" // of course here you should just use relative for your api)
const LIMIT_PER_PAGE = 10


const calcPages = (total_users) => {
    let total = Math.floor(total_users / LIMIT_PER_PAGE)
    if(total_users % LIMIT_PER_PAGE > 0){
        total += 1
    }
    return total;
}


const getUsersResp = async ({substring, page}) => {
   const pageIdx = !! page ? page : 0;
   const searchStr = !! substring ? substring : "";
   const limit = LIMIT_PER_PAGE;
   const offset = pageIdx*limit;
   const response = await fetch(
    `${ENDPOINT}?limit=${limit}&offset=${offset}&search=${searchStr}`
   );
   const json = await response.json();
   return json;
};


const userInfoToOptionRepr = ({id, first_name, gender, job, isSelected}) => {
    return `
       <tr data-value=${id}>
         <th scope="row">${first_name}</th> 
         <td> ${first_name} </td>
         <td>${gender==="male"}<p> 
         <td> ${job}</p>
         <td> ${isSelected} </p>
       </tr>
    `
}


const usersRepr = (users) => {
    const tableHead = `
        <thead>
            <tr>
            <th scope="col">#</th>
            <th scope="col">first name</th>
            <th scope="col">gender</th>
            <th scope="col">job</th>
            <th scope="col">selected</th>
            </tr>
        </thead>
    `

    let reprRows = "";
    for(let user of users){
        reprRows += userInfoToOptionRepr(user);
    }
    return tableHead + reprRows;
}


function* rangeSimple(first, last){
    for (let i = first; i<last; i++){
        yield i;
    }
}


const reprButton = (idx) => `<button class=Paginator value=${idx}>${idx+1}</button>`;


const reprButtons = ({total, current}) => {
    let repr = ""
    if(total <= 10){
       for(let buttonNum of rangeSimple(0, total)){
           repr += reprButton(buttonNum)
       }
       return repr
    }
    if(current < 5){
        for(let buttonNum of rangeSimple(0, 10)){
            repr += reprButton(buttonNum)
        }
        repr += "<span>...</span>";
        repr += reprButton(total-1);
        return repr;
    }
    if(total > current + 5){
        repr += reprButton(0);
        repr += "<span>...</span>";
        for(let buttonNum of rangeSimple(current-5, current+5)){
            repr += reprButton(buttonNum)
        }
        repr += "<span>...</span>";
        repr += reprButton(total-1);
        return repr;
    }
    repr += reprButton(0);
    repr += "<span>...</span>";
    for(let buttonNum of rangeSimple(current-5, total)){
        repr += reprButton(buttonNum)
    }
    return repr;
}


class UsersState{
    constructor(fetchedUsers = [], selectedUsers = [], totalFetchedUsers = 0){
        this.fetchedUsers = fetchedUsers;
        this.selectedUsers = selectedUsers;
        this.totalFetchedUsers = totalFetchedUsers;
    }
    isSelected(userId){
        for(let user of this.selectedUsers){
            if(userId===user.id){
                return true;
            }
        }
        return false;
    }
    select(userId){
       for(let user of this.fetchedUsers){
         if(user.id === userId && user.isSelected !== true){
           user.isSelected = true;
           this.selectedUsers.push(user);
           return;
         }
       }
    }
    unselect(userId){
        for(const [idx, user] of this.selectedUsers.entries()){
          if(user.id === userId){
            user.isSelected=false;
            this.selectedUsers.splice(idx, 1);
            return;
          }
        }
    }
    getTotalSelectedUsers(){
        return this.selectedUsers.length;
    }
    getSelectedUsersIds(){
        return this.selectedUsers.map(user=>user.id);
    }
    getSubstringFilteredSelectedUsers(substring){
        return this.selectedUsers.reduce(
            (acc, user) => {
                if(user.first_name.includes(substring) || user.last_name.includes(substring)){
                    acc.push(user);
                    return acc;
                }
                return acc;
            },
            [],
        )
    };
    setFetchedUsers({fetchedUsers, totalFetchedUsers}){
        this.fetchedUsers = fetchedUsers;
        for(let user of this.fetchedUsers){
            user.isSelected = this.isSelected(user.id);
        }
        this.totalFetchedUsers = totalFetchedUsers;
    };
}


class PaginationSearchFetcher{
    //updates users state whenever we change current page
    // we could use something like has new info flag
    constructor(usersState, currentPage=0, searchStr=""){
        this.usersState = usersState;
        this.currentPage = currentPage;
        this.searchStr = searchStr;
    }
    async getInitialUsers(){
        const userResp = await getUsersResp({substring: this.searchStr, page: this.currentPage})
        this.usersState.setFetchedUsers({fetchedUsers: userResp.users, totalFetchedUsers: userResp.total_users})
    }
    async setCurrentPage(pageIdx){
        if(this.currentPage === pageIdx){return}
        const userResp = await getUsersResp({substring: this.searchStr, page: pageIdx})
        this.usersState.setFetchedUsers({fetchedUsers: userResp.users, totalFetchedUsers: userResp.total_users})
        this.currentPage = pageIdx;
    }
    async setSearchStr(searchStr){
        if(this.searchStr === searchStr){return}
        const userResp = await getUsersResp({substring: this.searchStr, page: this.currentPage})
        this.usersState.setFetchedUsers({fetchedUsers: userResp.users, totalFetchedUsers: userResp.total_users})
        this.searchStr = searchStr;
    }

    getUsersToDisplay(){
        return this.usersState.fetchedUsers;
    }
    getTotalPages(){
       return calcPages(this.usersState.totalFetchedUsers)
    }
}


class PaginationSelectedState{
    constructor(usersState, currentPage = 0, searchStr = ""){
        this.usersState=usersState;
        this.currentPage=currentPage;
        this.searchStr=searchStr;
    }
    async getInitialUsers(){
        return;
    }
    async setCurrentPage(pageIdx){
        this.currentPage = pageIdx;
    }
    async setSearchStr(searchStr){
        this.searchStr = searchStr;
    }
    getUsersToDisplay(){
        const firstIdx = this.currentPage * LIMIT_PER_PAGE;
        const lastIdx = firstIdx + LIMIT_PER_PAGE;
        const filtered = this.usersState.getSubstringFilteredSelectedUsers(this.searchStr)
        return filtered.splice(firstIdx, lastIdx);
    }
    getTotalPages(){
        return calcPages(this.usersState.selectedUsers.length)
     }
}


class UsersRenderer{
   constructor(elementSelector){
      this.paginationFetchedElement = elementSelector.paginationFetchedElement;
      this.paginationSelectedElement = elementSelector.paginationSelectedElement
      this.usersFetchedElement = elementSelector.usersFetchedElement;
      this.usersSelectedElement = elementSelector.usersSelectedElement;
      this.fetchedState = {currentPage: 0, totalPages: 0, users: []};
      this.selectedState = {currentPage: 0, totalPages: 0, users: []};
      // should add last rendered and comparison before rendering
   }
   setPaginationFetched(currentPage, totalPages){
     if(this.fetchedState.currentPage === currentPage && this.fetchedState.totalPages === totalPages){
        return;
     }
     this.paginationFetchedElement.innerHTML = reprButtons({total: totalPages, current: currentPage});
     this.fetchedState.currentPage = currentPage;
     this.fetchedState.totalPages = totalPages;
   }
   setPaginationSelected(currentPage, totalPages){
    if(this.selectedState.currentPage === currentPage && this.selectedState.totalPages === totalPages){
        return;
     }
      this.paginationSelectedElement.innerHTML = reprButtons({total: totalPages, current: currentPage});
      this.selectedState.currentPage = currentPage;
      this.selectedState.totalPages = totalPages;
   }
   setFetchedUsers(users){
    if(this.fetchedState.users === JSON.stringify(users)){
        return;
    }
    this.usersFetchedElement.innerHTML = usersRepr(users);
    this.fetchedState.users = JSON.stringify(users);
   }
   setSelectedUsers(users){
    if(this.selectedState.users === JSON.stringify(users)){
        return;
    }
    this.usersSelectedElement.innerHTML = usersRepr(users);
    this.selectedState.users = JSON.stringify(users);
   }
}


class UsersUseCases{
    // here we c
    constructor({usersState, paginatorSearch, paginatorSelect, renderer}){
        this.paginatorSearch = paginatorSearch;
        this.paginatorSelect = paginatorSelect;
        this.renderer = renderer;
        this.usersState = usersState;
    }
    async getInitialState(){
        await this.paginatorSearch.getInitialUsers();
        await this.paginatorSelect.getInitialUsers();
        this.updateRenderer();
    }
    updateRenderer(){
        this.renderer.setPaginationFetched(this.paginatorSearch.currentPage, this.paginatorSearch.getTotalPages())
        this.renderer.setPaginationSelected(this.paginatorSelect.currentPage, this.paginatorSelect.getTotalPages())
        this.renderer.setFetchedUsers(this.paginatorSearch.getUsersToDisplay())
        this.renderer.setSelectedUsers(this.paginatorSelect.getUsersToDisplay())
    }
    selectUser(userId){
        this.usersState.select(userId);
        this.updateRenderer();
    }
    unselectUser(userId){
        this.usersState.unselect(userId);
        this.updateRenderer();
    }
    collectUserIds(){
        return this.usersState.getSelectedUsersIds();
    }
    async setSearchFilterStr(substring){
        await this.paginatorSearch.setSearchStr(substring);
        this.updateRenderer();
    }
    async setSelectedFilterStr(substring){
        await this.paginatorSelect.setSearchStr(substring);
        this.updateRenderer();
    }
    async setSearchPage(pageIdx){
        await this.paginatorSearch.setCurrentPage(pageIdx);
        this.updateRenderer();
    }
    async setSelectedPage(pageIdx){
        await this.paginatorSelect.setCurrentPage(pageIdx);
        this.updateRenderer();
    }
    async submitForm(form){
        const formData = new FormData(form);
        formData.append("users", this.usersState.getSelectedUsersIds());
        console.log("collected in formdata ready to send", Array.from(formData));
    }
}


class ElementSelector{
    constructor({
        paginationFetchedElementId,
        paginationSelectedElementId,
        usersFetchedElementId,
        usersSelectedElementId,
        paginationFetchedSearchBarElementId,
        paginationSelectedSearchBarElementId,
        formElementId,
    }){
        this.paginationFetchedElement = document.getElementById(paginationFetchedElementId)
        this.paginationSelectedElement = document.getElementById(paginationSelectedElementId)
        this.usersFetchedElement = document.getElementById(usersFetchedElementId)
        this.usersSelectedElement = document.getElementById(usersSelectedElementId)
        this.paginationFetchedSearchBarElement = document.getElementById(paginationFetchedSearchBarElementId)
        this.paginationSelectedSearchBarElement = document.getElementById(paginationSelectedSearchBarElementId)
        this.formElement = document.getElementById(formElementId)
    }
}


const wireChangeFetchPageForButton = ({elementSelector, useCases}) => {
    elementSelector.paginationFetchedElement.addEventListener(
        "click", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target;
            const pageNum = parseInt(element.value)
            await useCases.setSearchPage(pageNum)
        },
    )
}


const wireChangeSelectPageForButton = ({elementSelector, useCases}) => {
    elementSelector.paginationSelectedElement.addEventListener(
        "click", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target;
            const pageNum = parseInt(element.value)
            await useCases.setSelectedPage(pageNum)
        },
    )
}


const wireClickOnFetchedUser = ({elementSelector, useCases}) => {
    elementSelector.usersFetchedElement.addEventListener(
        "click", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target;
            const row = element.parentElement;
            const userId = parseInt(row.dataset.value)
            await useCases.selectUser(userId)
        },
    )
}



const wireClickOnSelectedUser = ({elementSelector, useCases}) => {
    elementSelector.usersSelectedElement.addEventListener(
        "click", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target;
            const row = element.parentElement;
            const userId = parseInt(row.dataset.value)
            await useCases.unselectUser(userId)
        },
    )
}


const wireChangeFetchSubstring = ({elementSelector, useCases}) => {
    elementSelector.paginationFetchedSearchBarElement.addEventListener(
        "change", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target;
            const text = element.value;
            await useCases.setSearchFilterStr(text);
        },
    )
}


const wireChangeSelectSubstring = ({elementSelector, useCases}) => {
    elementSelector.paginationSelectedSearchBarElement.addEventListener(
        "change", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target;
            const text = element.value;
            await useCases.setSelectedFilterStr(text);
        },
    )
}


const wireFormSubmit = ({elementSelector, useCases}) => {
    elementSelector.formElement.addEventListener(
        "submit", 
        async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const form = event.target;
            await useCases.submitForm(form);
        },
    )
}


const initializeAll = async ({
    paginationFetchedElementId,
    paginationSelectedElementId,
    usersFetchedElementId,
    usersSelectedElementId,
    paginationFetchedSearchBarElementId,
    paginationSelectedSearchBarElementId,
    formElementId,
}) => {
    const elementSelector = new ElementSelector({
        paginationFetchedElementId: paginationFetchedElementId,
        paginationSelectedElementId: paginationSelectedElementId,
        usersFetchedElementId: usersFetchedElementId,
        usersSelectedElementId: usersSelectedElementId,
        paginationFetchedSearchBarElementId: paginationFetchedSearchBarElementId,
        paginationSelectedSearchBarElementId: paginationSelectedSearchBarElementId,
        formElementId: formElementId,
    });
    const usersState = new UsersState();
    const paginationSearchFetcher = new PaginationSearchFetcher(usersState);
    const paginationSelector = new PaginationSelectedState(usersState);
    const renderer = new UsersRenderer(elementSelector);
    const useCases = new UsersUseCases({
        usersState: usersState,
        paginatorSearch: paginationSearchFetcher,
        paginatorSelect: paginationSelector,
        renderer: renderer,
    })
    await useCases.getInitialState();
    wireChangeFetchPageForButton({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    wireChangeSelectPageForButton({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    wireChangeFetchSubstring({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    wireChangeSelectSubstring({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    wireClickOnFetchedUser({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    wireClickOnSelectedUser({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    wireFormSubmit({
        elementSelector:elementSelector,
        useCases:useCases,
    });
    //calls to add event listeners wiring usecases to elements! need to add here
}

(async () => {
    try {
        await initializeAll({
                paginationFetchedElementId: "paginatorFetched",
                paginationSelectedElementId: "paginatorSelected",
                usersFetchedElementId: "itemsFetched",
                usersSelectedElementId: "itemsSelected",
                paginationFetchedSearchBarElementId: "fetchSearchString",
                paginationSelectedSearchBarElementId: "selectSearchString",
                formElementId: "collect",
            });
    } catch (e) {
        console.error(e);
    }
})();
